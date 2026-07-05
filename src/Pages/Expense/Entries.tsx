import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createExpenseEntry,
  deleteExpenseEntry,
  getAllExpenseEntries,
  getExpenseEntryById,
  updateExpenseEntry,
} from "../../Utils/Api";

const { Title, Text } = Typography;

type ExpenseEntryRow = {
  _id?: string;
  id?: string;
  expenseDate: string;
  expenseType: string;
  reason?: string;
  paymentType: "cash" | "online" | "bank";
  amount: number;
};

type ExpenseEntryFormValues = {
  expenseDate: dayjs.Dayjs;
  expenseType: string;
  reason?: string;
  paymentType: "cash" | "online" | "bank";
  amount: number;
};

const THEME = {
  dark: "#0f3d3e",
  mid: "#00695C",
};

const EXPENSE_OPTIONS = [
  { value: "transport", label: "Transport" },
  { value: "salary", label: "Salary" },
  { value: "fuel", label: "Fuel" },
  { value: "other", label: "Other" },
];

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online" },
  { value: "bank", label: "Bank" },
];

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const toTitleCase = (value?: string) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getEntryId = (entry?: ExpenseEntryRow | null) => entry?._id || entry?.id || "";

const ExpenseEntriesPage: React.FC = () => {
  const [data, setData] = useState<ExpenseEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseEntryRow | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("all");
  const [form] = Form.useForm<ExpenseEntryFormValues>();
  const watchedExpenseType = Form.useWatch("expenseType", form);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllExpenseEntries({
        expenseType: selectedExpenseType === "all" ? undefined : selectedExpenseType,
      });
      const entries = Array.isArray(response?.data) ? response.data : [];
      setData(
        entries.filter((entry: ExpenseEntryRow) => {
          const parsed = dayjs(entry?.expenseDate);
          return parsed.isValid() && parsed.format("YYYY-MM") === selectedMonth;
        }),
      );
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load expense entries");
    } finally {
      setLoading(false);
    }
  }, [selectedExpenseType, selectedMonth]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      expenseDate: dayjs(),
      expenseType: "transport",
      paymentType: "cash",
      amount: 0,
      reason: "",
    });
    setModalOpen(true);
  };

  const openEdit = async (record: ExpenseEntryRow) => {
    const entryId = getEntryId(record);
    if (!entryId) {
      message.error("Expense entry id is missing");
      return;
    }

    setSaving(true);
    try {
      const response = await getExpenseEntryById(entryId);
      const entry = response?.data as ExpenseEntryRow;
      setEditingItem(entry);
      form.setFieldsValue({
        expenseDate: dayjs(entry.expenseDate),
        expenseType: entry.expenseType,
        reason: entry.reason || "",
        paymentType: entry.paymentType,
        amount: Number(entry.amount || 0),
      });
      setModalOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load expense entry");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: ExpenseEntryFormValues) => {
    setSaving(true);
    try {
      const payload = {
        expenseDate: values.expenseDate.format("YYYY-MM-DD"),
        expenseType: values.expenseType,
        reason: values.expenseType === "other" ? String(values.reason || "").trim() : "",
        paymentType: values.paymentType,
        amount: Number(values.amount || 0),
      };

      if (editingItem) {
        await updateExpenseEntry(getEntryId(editingItem), payload);
        message.success("Expense entry updated successfully");
      } else {
        await createExpenseEntry(payload);
        message.success("Expense entry created successfully");
      }

      closeModal();
      await loadEntries();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save expense entry");
      setSaving(false);
    }
  };

  const handleDelete = async (record: ExpenseEntryRow) => {
    try {
      await deleteExpenseEntry(getEntryId(record));
      message.success("Expense entry deleted successfully");
      await loadEntries();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete expense entry");
    }
  };

  const columns: ColumnsType<ExpenseEntryRow> = [
    {
      title: "#",
      key: "serial",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "expenseDate",
      key: "expenseDate",
      render: (value) => <Text strong>{formatDate(value)}</Text>,
    },
    {
      title: "Expense",
      dataIndex: "expenseType",
      key: "expenseType",
      render: (value) => toTitleCase(value),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (value) => value || "-",
    },
    {
      title: "Payment Type",
      dataIndex: "paymentType",
      key: "paymentType",
      render: (value) => toTitleCase(value),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 180,
      render: (value) => <Text strong style={{ color: THEME.mid }}>{formatCurrency(value)}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit entry">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                void openEdit(record);
              }}
              style={{ color: THEME.mid, borderRadius: 10, width: 36, height: 36 }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete expense entry"
            description="Are you sure you want to delete this expense entry?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={(event) => {
              event?.stopPropagation();
              void handleDelete(record);
            }}
          >
            <Tooltip title="Delete entry">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
                style={{ borderRadius: 10, width: 36, height: 36 }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const visibleTotalAmount = data.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return (
    <div
      style={{
        padding: 20,
        minHeight: "calc(100vh - 50px)",
        background:
          "radial-gradient(circle at top left, rgba(13, 148, 136, 0.12) 0%, rgba(13, 148, 136, 0) 32%), linear-gradient(180deg, #f7fcfb 0%, #eff7f5 42%, #f8fafc 100%)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(0, 105, 92, 0.08)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
        }}
      >
        <Space
          align="start"
          style={{
            width: "100%",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
              Expense Entry
            </Title>
            <Text type="secondary">
              Expense list with add and edit modal for date, expense type, reason, payment type and amount.
            </Text>
          </div>

          <Space size={12} wrap>
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 16,
                border: "1px solid rgba(0, 105, 92, 0.12)",
                background: "linear-gradient(135deg, rgba(224, 247, 246, 0.92) 0%, rgba(240, 253, 250, 0.98) 100%)",
                minWidth: 180,
              }}
            >
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Expense Total
              </Text>
              <Text strong style={{ color: THEME.mid, fontSize: 20 }}>
                {formatCurrency(visibleTotalAmount)}
              </Text>
            </div>

            <DatePicker
              picker="month"
              size="large"
              value={dayjs(`${selectedMonth}-01`)}
              onChange={(value) => setSelectedMonth((value || dayjs()).format("YYYY-MM"))}
              format="MMMM YYYY"
              allowClear={false}
              style={{ minWidth: 180 }}
            />

            <Select
              size="large"
              value={selectedExpenseType}
              onChange={setSelectedExpenseType}
              style={{ minWidth: 220 }}
              options={[
                { value: "all", label: "All Expenses" },
                ...EXPENSE_OPTIONS,
              ]}
              placeholder="Filter by expense"
            />

            <Button
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
              }}
            >
              Add Expense
            </Button>
          </Space>
        </Space>

        <Table
          rowKey={(record) => getEntryId(record)}
          dataSource={data}
          columns={columns}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No expense entries found" /> }}
          scroll={{ x: "max-content", y: 560 }}
        />
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Expense Entry" : "Add Expense Entry"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Select date, expense type, payment type and amount. Other expenses can include a reason.
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingItem ? "Update Entry" : "Save Entry"}
        okButtonProps={{
          loading: saving,
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        width={720}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: "grid", gap: 16 }}>
            <Form.Item
              label="Date"
              name="expenseDate"
              rules={[{ required: true, message: "Please select date" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker size="large" style={{ width: "100%" }} format="DD MMM YYYY" />
            </Form.Item>

            <Form.Item
              label="Expense"
              name="expenseType"
              rules={[{ required: true, message: "Please select expense type" }]}
              style={{ marginBottom: 0 }}
            >
              <Select size="large" options={EXPENSE_OPTIONS} placeholder="Select expense type" />
            </Form.Item>

            {watchedExpenseType === "other" ? (
              <Form.Item
                label="Reason"
                name="reason"
                rules={[{ required: true, message: "Please enter reason" }]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  size="large"
                  placeholder="Enter reason"
                  style={{ width: "100%", borderRadius: 8, borderColor: "#d9d9d9" }}
                />
              </Form.Item>
            ) : null}

            <Form.Item
              label="Amount"
              name="amount"
              rules={[{ required: true, message: "Please enter amount" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber size="large" min={0} style={{ width: "100%" }} placeholder="Enter amount" />
            </Form.Item>

            <Form.Item
              label="Payment Type"
              name="paymentType"
              rules={[{ required: true, message: "Please select payment type" }]}
              style={{ marginBottom: 0 }}
            >
              <Select size="large" options={PAYMENT_OPTIONS} placeholder="Select payment type" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

export default ExpenseEntriesPage;
