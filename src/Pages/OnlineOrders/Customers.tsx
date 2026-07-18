import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  addOnlineCustomer,
  deleteOnlineCustomer,
  getAllOnlineCustomers,
  updateOnlineCustomer,
} from "../../Utils/Api";
import "./Index.css";

const { Search, TextArea } = Input;
const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type OnlineCustomerItem = {
  _id?: string;
  id?: string;
  name: string;
  phoneNumber: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
};

type CustomerFormValues = {
  name: string;
  phoneNumber: string;
  address: string;
};

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const OnlineCustomersPage: React.FC = () => {
  const [data, setData] = useState<OnlineCustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OnlineCustomerItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm<CustomerFormValues>();

  const loadCustomers = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllOnlineCustomers(
        search.trim() ? { search: search.trim() } : undefined,
      );
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load online customers",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: OnlineCustomerItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      phoneNumber: item.phoneNumber,
      address: item.address,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    setSaving(true);

    try {
      const payload = {
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim(),
        address: values.address.trim(),
      };

      if (editingItem) {
        await updateOnlineCustomer(editingItem._id || editingItem.id || "", payload);
        message.success("Online customer updated successfully");
      } else {
        await addOnlineCustomer(payload);
        message.success("Online customer created successfully");
      }

      closeModal();
      await loadCustomers(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save online customer",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOnlineCustomer(id);
      message.success("Online customer deleted successfully");
      await loadCustomers(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete online customer",
      );
    }
  };

  const columns: ColumnsType<OnlineCustomerItem> = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Phone Number",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      render: (value: string) => (
        <Text style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</Text>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (value?: string) => formatDate(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            aria-label={`Edit ${record.name}`}
            style={{
              color: THEME.mid,
              borderRadius: 10,
              width: 36,
              height: 36,
            }}
          />
          <Popconfirm
            title="Delete customer"
            description={`Delete ${record.name}?`}
            onConfirm={() => handleDelete(record._id || record.id || "")}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              aria-label={`Delete ${record.name}`}
              style={{
                borderRadius: 10,
                width: 36,
                height: 36,
              }}
            />
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
              marginBottom: 8,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
                Online Customers
              </Title>
              <Text style={{ color: "#64748b" }}>
                Manage online customer records with name, phone number, and address.
              </Text>
            </div>
            <Space wrap>
              <Search
                placeholder="Search customer"
                allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={(value) => {
                setSearchText(value);
                void loadCustomers(value);
              }}
              style={{ width: 240 }}
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
                fontWeight: 600,
                background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
                boxShadow: "0 10px 20px rgba(0, 105, 92, 0.18)",
              }}
            >
              Add Customer
            </Button>
          </Space>
        </Space>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load customers"
            description={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Table
          className="online-module-table"
          style={{ marginTop: 20 }}
          columns={columns}
          dataSource={data.map((item) => ({
            ...item,
            key: item._id || item.id || item.phoneNumber,
          }))}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowClassName={() => "online-module-row"}
        />
      </Card>

      <Modal
        className="online-module-modal"
        title={editingItem ? "Edit Online Customer" : "Add Online Customer"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingItem ? "Update" : "Create"}
        okButtonProps={{
          style: {
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
          },
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter customer name" }]}
          >
            <Input placeholder="Enter customer name" />
          </Form.Item>
          <Form.Item
            label="Phone Number"
            name="phoneNumber"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <TextArea rows={4} placeholder="Enter address" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OnlineCustomersPage;
