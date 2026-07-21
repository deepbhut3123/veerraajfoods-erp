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
  Typography,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  reorderProducts,
  updateProduct,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type ProductItem = {
  _id: string;
  productName: string;
  productNameGujarati?: string;
  mrp: number;
  productRate: number;
  sequence: number;
  createdAt?: string;
};

type ProductFormValues = {
  productName: string;
  productNameGujarati?: string;
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
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
    void loadProducts();
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
      productNameGujarati: item.productNameGujarati,
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
    const payload = {
      productName: values.productName,
      ...(values.productNameGujarati?.trim()
        ? { productNameGujarati: values.productNameGujarati.trim() }
        : {}),
      mrp: values.mrp,
      productRate: values.productRate,
    };
    try {
      if (editingItem) {
        await updateProduct(editingItem._id, payload);
        message.success("Product updated successfully");
      } else {
        await addProduct(payload);
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

  const handleReorder = async (draggedId: string, targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      return;
    }

    const previousData = [...data];
    const draggedIndex = previousData.findIndex((item) => item._id === draggedId);
    const targetIndex = previousData.findIndex((item) => item._id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const reordered = [...previousData];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    const sequenced = reordered.map((item, index) => ({
      ...item,
      sequence: index + 1,
    }));

    setData(sequenced);

    try {
      await reorderProducts(sequenced.map((item) => item._id));
      message.success("Product sequence updated");
      await loadProducts();
    } catch (err: any) {
      setData(previousData);
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update product sequence",
      );
    }
  };

  const columns: ColumnsType<ProductItem> = [
    {
      title: "",
      key: "drag",
      width: 56,
      align: "center",
      render: () => (
        <span
          className="product-drag-handle"
          aria-label="Drag to reorder product"
        >
          <HolderOutlined />
        </span>
      ),
    },
    {
      title: "#",
      dataIndex: "sequence",
      key: "sequence",
      width: 80,
      align: "center",
    },
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      width: 120,
      render: (value: number) => `₹${value.toFixed(2)}`,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      width: 320,
      render: (_, record) => <Text strong>{record.productName}</Text>,
    },
    {
      title: "Product Rate",
      dataIndex: "productRate",
      key: "productRate",
      width: 140,
      render: (value: number) => `₹${value.toFixed(2)}`,
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
            <Text style={{ color: "#64748b" }}>
              Drag rows to change saved product sequence.
            </Text>
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
            pagination={false}
            scroll={{ x: "max-content", y: 520 }}
            columns={columns}
            rowClassName={(record) =>
              record._id === draggingId ? "product-row product-row-dragging" : "product-row"
            }
            onRow={(record) => ({
              draggable: true,
              onDragStart: (event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", record._id);
                setDraggingId(record._id);
              },
              onDragOver: (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              },
              onDrop: (event) => {
                event.preventDefault();
                const draggedProductId = event.dataTransfer.getData("text/plain");
                setDraggingId(null);
                void handleReorder(draggedProductId, record._id);
              },
              onDragEnd: () => {
                setDraggingId(null);
              },
            })}
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
              Enter product name, rate and MRP
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
        width={860}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Product Name"
              name="productName"
              rules={[{ required: true, message: "Please enter product name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="Enter product name"
                size="large"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Product Name (Gujarati)"
              name="productNameGujarati"
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="ગુજરાતી પ્રોડક્ટ નામ લખો"
                size="large"
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
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
