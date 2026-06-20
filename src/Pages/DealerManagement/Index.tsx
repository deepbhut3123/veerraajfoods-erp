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
  getAllDealers,
  updateDealer,
} from "../../Utils/Api";

const { Title } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type DealerItem = {
  _id: string;
  dealerName: string;
  contactNo: string;
  city: string;
  margin: number;
  isActive: boolean;
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
  };
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
  const [form] = Form.useForm<DealerFormValues>();

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

  const handleSubmit = async (values: DealerFormValues) => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateDealer(editingItem._id, values);
        message.success("Dealer updated successfully");
      } else {
        await addDealer(values);
        message.success("Dealer created successfully");
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
      title: "Created By",
      key: "userId",
      width: 180,
      render: (_, record) => record.userId?.name || record.userId?.email || "-",
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
    </div>
  );
};

export default DealerPage;
