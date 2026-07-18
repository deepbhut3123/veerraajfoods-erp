import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
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
  addDealer,
  deleteDealer,
  getAllDealerBills,
  getAllDealers,
  getAllDealerPayments,
  updateDealer,
} from "../../Utils/Api";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

const formatAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime())
    ? "-"
    : parsedDate.toLocaleDateString("en-GB");
};

const getPaymentTypeTone = (value?: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "bank") {
    return {
      text: "#1d4ed8",
      background: "rgba(59, 130, 246, 0.12)",
      border: "1px solid rgba(59, 130, 246, 0.22)",
    };
  }

  if (normalized === "online") {
    return {
      text: "#7c3aed",
      background: "rgba(124, 58, 237, 0.12)",
      border: "1px solid rgba(124, 58, 237, 0.2)",
    };
  }

  return {
    text: "#0f766e",
    background: "rgba(15, 118, 110, 0.12)",
    border: "1px solid rgba(15, 118, 110, 0.2)",
  };
};

type DealerItem = {
  _id: string;
  dealerName: string;
  contactNo: string;
  city: string;
  margin: number;
  pendingPayment?: number;
  isActive: boolean;
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

type DealerBillItem = {
  _id: string;
  billDate?: string;
  totalAmount?: number;
  kattaCount?: number;
};

type DealerPaymentItem = {
  _id: string;
  paymentDate?: string;
  amount?: number;
  paymentType?: "cash" | "online" | "bank";
};

type DealerFormValues = {
  dealerName: string;
  contactNo: string;
  city: string;
  margin: number;
  isActive: boolean;
};

const DealerPage: React.FC = () => {
  const [data, setData] = useState<DealerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<DealerItem | null>(null);
  const [activeDealer, setActiveDealer] = useState<DealerItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dealerBills, setDealerBills] = useState<DealerBillItem[]>([]);
  const [dealerPayments, setDealerPayments] = useState<DealerPaymentItem[]>([]);
  const [form] = Form.useForm<DealerFormValues>();
  const totalBillAmount = dealerBills.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const totalPaymentAmount = dealerPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingPaymentAmount = activeDealer?.pendingPayment ?? totalBillAmount - totalPaymentAmount;

  const loadDealers = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealers({
        search: search.trim() || undefined,
      });
      setData(response?.data || []);
      setSelectedRowKeys([]);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dealers",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDealers(searchText);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setModalOpen(true);
  };

  const openEdit = (item: DealerItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      dealerName: item.dealerName,
      contactNo: item.contactNo,
      city: item.city,
      margin: item.margin,
      isActive: item.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const openDealerDetails = async (dealer: DealerItem) => {
    setActiveDealer(dealer);
    setDetailsOpen(true);
    setDetailsLoading(true);

    try {
      const [billsRes, paymentsRes] = await Promise.all([
        getAllDealerBills({ dealerId: dealer._id, status: "shipped" }),
        getAllDealerPayments({ dealerId: dealer._id }),
      ]);

      setDealerBills(Array.isArray(billsRes?.data) ? billsRes.data : []);
      setDealerPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dealer statement",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsOpen(false);
    setActiveDealer(null);
    setDealerBills([]);
    setDealerPayments([]);
  };

  const handleSubmit = async (values: DealerFormValues) => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateDealer(editingItem._id, values);
        message.success("Dealer updated successfully");
      } else {
        const response = await addDealer(values);
        if (response?.temporaryPassword) {
          Modal.info({
            title: "Dealer login created",
            content: (
              <Space direction="vertical" size={4}>
                <Text>Mobile number: {values.contactNo}</Text>
                <Text>
                  Temporary password: <Text strong copyable>{response.temporaryPassword}</Text>
                </Text>
              </Space>
            ),
            okText: "Done",
          });
        } else {
          message.success("Dealer created successfully");
        }
      }

      closeModal();
      await loadDealers(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save dealer",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDealer(id);
      message.success("Dealer deleted successfully");
      await loadDealers(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete dealer",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;

    try {
      await Promise.all(selectedRowKeys.map((id) => deleteDealer(String(id))));
      message.success("Selected dealers deleted successfully");
      await loadDealers(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete selected dealers",
      );
    }
  };

  const columns: ColumnsType<DealerItem> = [
    {
      title: "#",
      key: "serialNumber",
      width: 90,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Name",
      dataIndex: "dealerName",
      key: "dealerName",
      render: (value: string, record) => (
        <Button
          type="link"
          onClick={() => {
            void openDealerDetails(record);
          }}
          style={{
            padding: 0,
            height: "auto",
            color: THEME.mid,
            fontWeight: 600,
          }}
        >
          {value}
        </Button>
      ),
    },
    {
      title: "Contact No",
      dataIndex: "contactNo",
      key: "contactNo",
      width: 150,
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 160,
    },
    {
      title: "Margin",
      dataIndex: "margin",
      key: "margin",
      width: 120,
      render: (value: number) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      title: "Pending Payment",
      dataIndex: "pendingPayment",
      key: "pendingPayment",
      width: 180,
      render: (value: number) => (
        <Tag color={Number(value || 0) > 0 ? "orange" : "green"} style={{ margin: 0 }}>
          {formatAmount(value)}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "isActive",
      width: 120,
      render: (_, record) => (
        <Tag color={record.isActive ? "green" : "default"} style={{ margin: 0 }}>
          {record.isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit dealer">
            <Button
              type="text"
              aria-label="Edit dealer"
              onClick={(event) => {
                event.stopPropagation();
                openEdit(record);
              }}
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
            title="Delete dealer"
            description="Are you sure you want to delete this dealer?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="Delete dealer">
              <Button
                type="text"
                aria-label="Delete dealer"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
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
              Dealers
            </Title>
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search name, contact, city, margin"
              style={{ width: 300 }}
            />
            <Popconfirm
              title="Delete selected dealers"
              description={`Are you sure you want to delete ${selectedRowKeys.length} selected dealer${selectedRowKeys.length === 1 ? "" : "s"}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={handleBulkDelete}
              disabled={!selectedRowKeys.length}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedRowKeys.length}
                style={{
                  height: 42,
                  paddingInline: 18,
                  borderRadius: 12,
                }}
              >
                Delete Selected
              </Button>
            </Popconfirm>
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
              Add Dealer
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
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
              {editingItem ? "Edit Dealer" : "Add Dealer"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Enter dealer name, contact number, city and margin
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
              label="Name"
              name="dealerName"
              rules={[{ required: true, message: "Please enter dealer name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter dealer name"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Contact No"
              name="contactNo"
              rules={[{ required: true, message: "Please enter contact number" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter contact number"
                style={{ borderRadius: 12 }}
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
              label="City"
              name="city"
              rules={[{ required: true, message: "Please enter city" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter city"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Margin"
              name="margin"
              rules={[{ required: true, message: "Please enter margin" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                size="large"
                placeholder="Enter margin"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          <div style={{ marginTop: 16 }}>
            <Form.Item
              label="Active"
              name="isActive"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        open={detailsOpen}
        onCancel={closeDetailsModal}
        footer={null}
        width={1100}
        centered
        styles={{
          body: {
            paddingTop: 12,
            background:
              "linear-gradient(180deg, #f8fcfb 0%, #f2f8f7 50%, #ffffff 100%)",
          },
        }}
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              Dealer Pending Payment Details
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Bills and payments shown date-wise in latest-first order
            </span>
          </div>
        }
      >
        {activeDealer ? (
          <div style={{ display: "grid", gap: 20 }}>
            <div
              style={{
                padding: "22px 24px",
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, rgba(0, 105, 92, 0.1) 0%, rgba(224, 247, 246, 0.95) 55%, rgba(255, 255, 255, 0.98) 100%)",
                border: "1px solid rgba(0, 105, 92, 0.12)",
                boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1.2fr) repeat(3, minmax(0, 1fr))",
                  gap: 12,
                alignItems: "stretch",
              }}
            >
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    alignContent: "center",
                    padding: "8px 4px",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "#0f766e",
                    }}
                  >
                    Dealer Statement
                  </Text>
                  <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
                    {activeDealer.dealerName}
                  </Title>
                  <Text style={{ color: "#475569", fontSize: 15 }}>
                    Contact: {activeDealer.contactNo || "-"}
                  </Text>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background: "rgba(255, 255, 255, 0.82)",
                    border: "1px solid rgba(0, 105, 92, 0.12)",
                  }}
                >
                  <Text style={{ display: "block", color: "#64748b", fontSize: 12 }}>
                    Total Bills
                  </Text>
                  <Text strong style={{ color: "#0f172a", fontSize: 18 }}>
                    {formatAmount(totalBillAmount)}
                  </Text>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background: "rgba(255, 255, 255, 0.82)",
                    border: "1px solid rgba(0, 105, 92, 0.12)",
                  }}
                >
                  <Text style={{ display: "block", color: "#64748b", fontSize: 12 }}>
                    Total Payments
                  </Text>
                  <Text strong style={{ color: "#0f172a", fontSize: 18 }}>
                    {formatAmount(totalPaymentAmount)}
                  </Text>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background:
                      Number(pendingPaymentAmount || 0) > 0
                        ? "linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(255, 255, 255, 0.92) 100%)"
                        : "linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(255, 255, 255, 0.92) 100%)",
                    border:
                      Number(pendingPaymentAmount || 0) > 0
                        ? "1px solid rgba(217, 119, 6, 0.2)"
                        : "1px solid rgba(5, 150, 105, 0.2)",
                  }}
                >
                  <Text
                    style={{
                      display: "block",
                      color: Number(pendingPaymentAmount || 0) > 0 ? "#b45309" : "#047857",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontSize: 12,
                    }}
                  >
                    Pending Payment
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: 18,
                      color: Number(pendingPaymentAmount || 0) > 0 ? "#92400e" : "#065f46",
                    }}
                  >
                    {formatAmount(pendingPaymentAmount)}
                  </Text>
                </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 18,
              }}
            >
              <Card
                bordered={false}
                loading={detailsLoading}
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(0, 105, 92, 0.08)",
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div
                  style={{
                    padding: "18px 20px 16px",
                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <Text strong style={{ color: THEME.dark, fontSize: 16 }}>
                      Bills
                    </Text>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                      Date-wise bill history
                    </div>
                  </div>
                  <Tag color="cyan" style={{ margin: 0, borderRadius: 999 }}>
                    {dealerBills.length} entries
                  </Tag>
                </div>
                <div
                  style={{
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.7fr 1fr",
                      gap: 12,
                      padding: "0 8px",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    <div>Date</div>
                    <div style={{ textAlign: "center" }}>Katta</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>

                  <div
                    style={{
                      maxHeight: 420,
                      overflowY: "auto",
                      display: "grid",
                      gap: 10,
                      paddingRight: 4,
                    }}
                  >
                    {dealerBills.length ? (
                      dealerBills.map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 0.7fr 1fr",
                            gap: 12,
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: 16,
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                            border: "1px solid rgba(0, 105, 92, 0.08)",
                            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
                          }}
                        >
                          <div style={{ display: "grid", gap: 2 }}>
                            <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                              {formatDate(item.billDate)}
                            </Text>
                            <Text style={{ color: "#64748b", fontSize: 12 }}>
                              Bill entry
                            </Text>
                          </div>

                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <div
                              style={{
                                minWidth: 54,
                                padding: "6px 10px",
                                textAlign: "center",
                                borderRadius: 999,
                                background: "rgba(0, 105, 92, 0.1)",
                                color: "#0f766e",
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              {item.kattaCount ?? "-"}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <div
                              style={{
                                padding: "8px 12px",
                                borderRadius: 12,
                                background: "rgba(5, 150, 105, 0.1)",
                                color: "#065f46",
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              {formatAmount(item.totalAmount)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "28px 16px",
                          borderRadius: 16,
                          border: "1px dashed rgba(148, 163, 184, 0.35)",
                          textAlign: "center",
                          color: "#64748b",
                          background: "rgba(248, 250, 252, 0.8)",
                        }}
                      >
                        No bills found
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card
                bordered={false}
                loading={detailsLoading}
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(0, 105, 92, 0.08)",
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.07)",
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div
                  style={{
                    padding: "18px 20px 16px",
                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <Text strong style={{ color: THEME.dark, fontSize: 16 }}>
                      Payments
                    </Text>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                      Date-wise payment history
                    </div>
                  </div>
                  <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>
                    {dealerPayments.length} entries
                  </Tag>
                </div>
                <div
                  style={{
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 1fr",
                      gap: 12,
                      padding: "0 8px",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    <div>Date</div>
                    <div>Type</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>

                  <div
                    style={{
                      maxHeight: 420,
                      overflowY: "auto",
                      display: "grid",
                      gap: 10,
                      paddingRight: 4,
                    }}
                  >
                    {dealerPayments.length ? (
                      dealerPayments.map((item) => {
                        const tone = getPaymentTypeTone(item.paymentType);
                        const typeLabel = item.paymentType
                          ? item.paymentType.charAt(0).toUpperCase() + item.paymentType.slice(1)
                          : "-";

                        return (
                          <div
                            key={item._id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 0.8fr 1fr",
                              gap: 12,
                              alignItems: "center",
                              padding: "14px 16px",
                              borderRadius: 16,
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                              border: "1px solid rgba(37, 99, 235, 0.08)",
                              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
                            }}
                          >
                            <div style={{ display: "grid", gap: 2 }}>
                              <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                                {formatDate(item.paymentDate)}
                              </Text>
                              <Text style={{ color: "#64748b", fontSize: 12 }}>
                                Payment entry
                              </Text>
                            </div>

                            <div>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: tone.background,
                                  border: tone.border,
                                  color: tone.text,
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                {typeLabel}
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <div
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 12,
                                  background: "rgba(37, 99, 235, 0.08)",
                                  color: "#1d4ed8",
                                  fontWeight: 700,
                                  fontSize: 15,
                                }}
                              >
                                {formatAmount(item.amount)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          padding: "28px 16px",
                          borderRadius: 16,
                          border: "1px dashed rgba(148, 163, 184, 0.35)",
                          textAlign: "center",
                          color: "#64748b",
                          background: "rgba(248, 250, 252, 0.8)",
                        }}
                      >
                        No payments found
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default DealerPage;
