import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addDealerPayment,
  deleteDealerPayment,
  getAllDealerPayments,
  getAllDealers,
  updateDealerPayment,
} from "../../Utils/Api";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

const PAYMENT_TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online" },
  { value: "bank", label: "Bank" },
] as const;

type PaymentType = (typeof PAYMENT_TYPE_OPTIONS)[number]["value"];

type DealerOption = {
  _id: string;
  dealerName: string;
  contactNo?: string;
  city?: string;
};

type DealerPaymentItem = {
  _id: string;
  paymentDate: string;
  dealerId?: {
    _id?: string;
    dealerName?: string;
    contactNo?: string;
    city?: string;
  };
  amount: number;
  paymentType: PaymentType;
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

type DealerPaymentFormValues = {
  paymentDate: Dayjs;
  dealerId: string;
  amount: number;
  paymentType: PaymentType;
};

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : "-";
};

const formatAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getPaymentTypeLabel = (type?: PaymentType) =>
  PAYMENT_TYPE_OPTIONS.find((item) => item.value === type)?.label || "-";

const DealerPaymentsPage: React.FC = () => {
  const [data, setData] = useState<DealerPaymentItem[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<DealerPaymentItem | null>(null);
  const [form] = Form.useForm<DealerPaymentFormValues>();

  const dealerOptions = useMemo(
    () =>
      dealers.map((dealer) => ({
        value: dealer._id,
        label: dealer.contactNo
          ? `${dealer.dealerName} - ${dealer.contactNo}`
          : dealer.dealerName,
      })),
    [dealers],
  );

  const loadPayments = async (search = "", range: DateRangeValue = null) => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealerPayments({
        search: search.trim() || undefined,
        fromDate: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
        toDate: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
      });
      setData(response?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dealer payments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayments(searchText, dateRange);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [dateRange, searchText]);

  useEffect(() => {
    const loadDealers = async () => {
      try {
        const response = await getAllDealers();
        setDealers(response?.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dealers for payments",
        );
      }
    };

    void loadDealers();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      paymentDate: dayjs(),
      dealerId: undefined,
      amount: undefined,
      paymentType: "cash",
    });
    setModalOpen(true);
  };

  const openEdit = (item: DealerPaymentItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      paymentDate: dayjs(item.paymentDate),
      dealerId: item.dealerId?._id || "",
      amount: Number(item.amount || 0),
      paymentType: item.paymentType,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: DealerPaymentFormValues) => {
    setSaving(true);

    try {
      const payload = {
        paymentDate: values.paymentDate.format("YYYY-MM-DD"),
        dealerId: values.dealerId,
        amount: Number(values.amount || 0),
        paymentType: values.paymentType,
      };

      if (editingItem) {
        await updateDealerPayment(editingItem._id, payload);
        message.success("Dealer payment updated successfully");
      } else {
        await addDealerPayment(payload);
        message.success("Dealer payment created successfully");
      }

      closeModal();
      await loadPayments(searchText, dateRange);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save dealer payment",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDealerPayment(id);
      message.success("Dealer payment deleted successfully");
      await loadPayments(searchText, dateRange);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete dealer payment",
      );
    }
  };

  const columns: ColumnsType<DealerPaymentItem> = [
    {
      title: "#",
      key: "serialNumber",
      width: 90,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 130,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Dealer",
      key: "dealerName",
      render: (_, record) => record.dealerId?.dealerName || "-",
    },
    {
      title: "Contact No",
      key: "contactNo",
      width: 150,
      render: (_, record) => record.dealerId?.contactNo || "-",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (value: number) => (
        <Tag color="green" style={{ margin: 0 }}>
          {formatAmount(value)}
        </Tag>
      ),
    },
    {
      title: "Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 120,
      render: (value: PaymentType) => (
        <Tag color="blue" style={{ margin: 0 }}>
          {getPaymentTypeLabel(value)}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit payment">
            <Button
              type="text"
              aria-label="Edit payment"
              onClick={() => openEdit(record)}
              icon={<EditOutlined />}
              style={{
                color: THEME.mid,
                borderRadius: 10,
                width: 36,
                height: 36,
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete payment"
            description="Are you sure you want to delete this dealer payment?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="Delete payment">
              <Button
                type="text"
                aria-label="Delete payment"
                danger
                icon={<DeleteOutlined />}
                style={{
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        background:
          "linear-gradient(180deg, #f6fbfb 0%, #eef6f5 45%, #f8fafc 100%)",
        minHeight: "calc(100vh - 50px)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(0, 105, 92, 0.08)",
          overflow: "hidden",
        }}
      >
        <Space
          align="start"
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
              Dealer Payments
            </Title>
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search dealer, contact, amount, type, date"
              style={{ width: 320 }}
            />
            <RangePicker
              allowClear
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              format="DD-MM-YYYY"
              size="large"
            />
            <Button
              onClick={openCreate}
              icon={<PlusOutlined />}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontWeight: 600,
                background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
                boxShadow: "0 10px 20px rgba(0, 105, 92, 0.18)",
              }}
            >
              Add Payment
            </Button>
          </Space>
        </Space>

        {error ? (
          <div style={{ marginTop: 16 }}>
            <Alert type="error" showIcon message={error} />
          </div>
        ) : (
          <Table
            style={{ marginTop: 20 }}
            rowKey="_id"
            loading={loading}
            dataSource={data}
            pagination={false}
            scroll={{ x: "max-content", y: 520 }}
            columns={columns}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Dealer Payment" : "Add Dealer Payment"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Select date, dealer, amount and payment type
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okButtonProps={{
          loading: saving,
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        destroyOnClose
        centered
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Date"
              name="paymentDate"
              rules={[{ required: true, message: "Please select payment date" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                format="DD-MM-YYYY"
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Dealer"
              name="dealerId"
              rules={[{ required: true, message: "Please select dealer" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                showSearch
                size="large"
                placeholder="Select dealer"
                optionFilterProp="label"
                options={dealerOptions}
              />
            </Form.Item>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Form.Item
              label="Amount"
              name="amount"
              rules={[
                { required: true, message: "Please enter amount" },
                {
                  validator: (_, value) =>
                    Number(value) > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("Please enter amount greater than 0")),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0.01}
                precision={2}
                step={0.01}
                size="large"
                placeholder="Enter amount"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Type"
              name="paymentType"
              rules={[{ required: true, message: "Please select payment type" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                placeholder="Select payment type"
                options={PAYMENT_TYPE_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DealerPaymentsPage;
