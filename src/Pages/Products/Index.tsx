import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
  soft: "#E0F7F6",
  soft2: "#B2DFDB",
  text: "#0f172a",
};

type ProductItem = {
  _id: string;
  productName: string;
  mrp: number;
  productRate: number;
  createdAt?: string;
};

type ProductFormValues = {
  productName: string;
  mrp: number;
  productRate: number;
};

const ProductsPage: React.FC = () => {
  const [data, setData] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);
  const [form] = Form.useForm<ProductFormValues>();

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getAllProducts();
      setData(res?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: ProductItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      mrp: item.mrp,
      productName: item.productName,
      productRate: item.productRate,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateProduct(editingItem._id, values);
        message.success("Product updated successfully");
      } else {
        await addProduct(values);
        message.success("Product created successfully");
      }
      closeModal();
      await loadProducts();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      message.success("Product deleted successfully");
      await loadProducts();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete product",
      );
    }
  };

  const columns: ColumnsType<ProductItem> = [
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      render: (value: number) => (
        <Tag color="green" style={{ borderRadius: 999 }}>
          INR {value.toFixed(2)}
        </Tag>
      ),
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "Product Rate",
      dataIndex: "productRate",
      key: "productRate",
      render: (value: number) => (
        <Tag color="blue" style={{ borderRadius: 999 }}>
          INR {value.toFixed(2)}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
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
            onConfirm={() => handleDelete(record._id)}
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
              Products
            </Title>
          </div>
          <Button
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
            icon={<PlusOutlined />}
          >
            Add Product
          </Button>
        </Space>

        {error ? (
          <div style={{ marginTop: 16 }}>
            <Text type="danger">{error}</Text>
          </div>
        ) : (
          <Table
            style={{ marginTop: 20 }}
            rowKey="_id"
            loading={loading}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            columns={columns}
            rowClassName={() => "product-row"}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Product" : "Add Product"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Enter MRP, product name and product rate
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
        cancelButtonProps={{
          style: {
            borderRadius: 10,
          },
        }}
        destroyOnClose
        centered
        width={640}
        styles={{
          header: {
            borderBottom: "1px solid rgba(0, 105, 92, 0.12)",
            padding: "18px 22px",
            background:
              "linear-gradient(135deg, rgba(224,247,246,0.95) 0%, rgba(255,255,255,1) 70%)",
          },
          body: {
            padding: "22px 24px 10px",
            background: "linear-gradient(180deg, #ffffff 0%, #fbfefd 100%)",
          },
          footer: {
            borderTop: "1px solid rgba(0, 105, 92, 0.12)",
            padding: "16px 24px 20px",
            background: "#fff",
          },
        }}
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
              label="MRP"
              name="mrp"
              rules={[{ required: true, message: "Please enter MRP" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                size="large"
                placeholder="Enter MRP"
              />
            </Form.Item>

            <Form.Item
              label="Product Rate"
              name="productRate"
              rules={[{ required: true, message: "Please enter product rate" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                size="large"
                placeholder="Enter product rate"
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Product Name"
            name="productName"
            rules={[{ required: true, message: "Please enter product name" }]}
            style={{ marginTop: 16, marginBottom: 0 }}
          >
            <Input
              placeholder="Enter product name"
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
