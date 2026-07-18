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
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  addOnlineProduct,
  deleteOnlineProduct,
  getAllOnlineProducts,
  updateOnlineProduct,
} from "../../Utils/Api";
import "./Index.css";

const { Search } = Input;
const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type OnlineProductRow = {
  _id?: string;
  id?: string;
  name: string;
  weight: string;
  mrp: number;
  createdAt?: string;
  updatedAt?: string;
};

type OnlineProductFormValues = {
  name: string;
  weight: string;
  mrp: number;
};

const OnlineProductsPage: React.FC = () => {
  const [data, setData] = useState<OnlineProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<OnlineProductRow | null>(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm<OnlineProductFormValues>();

  const loadProducts = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllOnlineProducts(
        search.trim() ? { search: search.trim() } : undefined,
      );
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load online products",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: OnlineProductRow) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      weight: item.weight,
      mrp: item.mrp,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOnlineProduct(id);
      message.success("Online product deleted successfully");
      await loadProducts(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete online product",
      );
    }
  };

  const handleSubmit = async (values: OnlineProductFormValues) => {
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      weight: values.weight.trim(),
      mrp: Number(values.mrp),
    };

    try {
      if (editingItem) {
        await updateOnlineProduct(editingItem._id || editingItem.id || "", payload);
        message.success("Online product updated successfully");
      } else {
        await addOnlineProduct(payload);
        message.success("Online product created successfully");
      }

      closeModal();
      await loadProducts(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save online product",
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<OnlineProductRow> = [
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
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
    },
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      render: (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit product">
            <Button
              type="text"
              aria-label="Edit product"
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
            title="Delete product"
            description="Are you sure you want to delete this product?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id || record.id || "")}
          >
            <Tooltip title="Delete product">
              <Button
                type="text"
                aria-label="Delete product"
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
              Online Products
            </Title>
            <Text style={{ color: "#64748b" }}>
              Maintain online catalog items with the same product management feel.
            </Text>
          </div>
          <Space wrap>
            <Search
              placeholder="Search product"
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={(value) => {
                setSearchText(value);
                void loadProducts(value);
              }}
              style={{ width: 240 }}
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
              Add Product
            </Button>
          </Space>
        </Space>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load products"
            description={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Table
          className="online-module-table"
          style={{ marginTop: 20 }}
          rowKey={(record) => record._id || record.id || record.name}
          dataSource={data}
          loading={loading}
          pagination={false}
          scroll={{ x: "max-content", y: 520 }}
          columns={columns}
          rowClassName={() => "online-module-row"}
        />
      </Card>

      <Modal
        className="online-module-modal"
        title={editingItem ? "Edit Online Product" : "Add Online Product"}
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
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>
          <Form.Item
            label="Weight"
            name="weight"
            rules={[{ required: true, message: "Please enter weight" }]}
          >
            <Input placeholder="Enter weight" />
          </Form.Item>
          <Form.Item
            label="MRP"
            name="mrp"
            rules={[{ required: true, message: "Please enter MRP" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OnlineProductsPage;
