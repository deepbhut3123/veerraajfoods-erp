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
import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addDealerProduct,
  deleteDealerProduct,
  getAllDealerProducts,
  reorderDealerProducts,
  updateDealerProduct,
} from "../../Utils/Api";
import "../Products/Index.css";

const { Title } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type DealerProductItem = {
  _id: string;
  mrp: number;
  productName: string;
  productNameGujarati?: string;
  productRate: number;
  sequence?: number;
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

type DealerProductFormValues = {
  mrp: number;
  productName: string;
  productNameGujarati?: string;
  productRate: number;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const DealerProductsPage: React.FC = () => {
  const [data, setData] = useState<DealerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<DealerProductItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [form] = Form.useForm<DealerProductFormValues>();

  const loadProducts = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealerProducts({
        search: search.trim() || undefined,
      });
      setData(response?.data || []);
      setSelectedRowKeys([]);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dealer products",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(searchText);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: DealerProductItem) => {
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

  const handleSubmit = async (values: DealerProductFormValues) => {
    setSaving(true);
    const payload = {
      mrp: values.mrp,
      productName: values.productName,
      ...(values.productNameGujarati?.trim()
        ? { productNameGujarati: values.productNameGujarati.trim() }
        : {}),
      productRate: values.productRate,
    };
    try {
      if (editingItem) {
        await updateDealerProduct(editingItem._id, payload);
        message.success("Dealer product updated successfully");
      } else {
        await addDealerProduct(payload);
        message.success("Dealer product created successfully");
      }

      closeModal();
      await loadProducts(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save dealer product",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDealerProduct(id);
      message.success("Dealer product deleted successfully");
      await loadProducts(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete dealer product",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;

    try {
      await Promise.all(
        selectedRowKeys.map((id) => deleteDealerProduct(String(id))),
      );
      message.success("Selected dealer products deleted successfully");
      await loadProducts(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete selected dealer products",
      );
    }
  };

  const handleReorder = async (draggedId: string, targetId: string) => {
    if (!draggedId || draggedId === targetId || searchText.trim()) {
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
      await reorderDealerProducts(sequenced.map((item) => item._id));
      message.success("Dealer product sequence updated");
      await loadProducts(searchText);
    } catch (err: any) {
      setData(previousData);
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update dealer product sequence",
      );
    }
  };

  const columns: ColumnsType<DealerProductItem> = [
    {
      title: "",
      key: "drag",
      width: 56,
      align: "center",
      render: () => (
        <span
          className="product-drag-handle"
          aria-label="Drag to reorder dealer product"
        >
          <HolderOutlined />
        </span>
      ),
    },
    {
      title: "#",
      dataIndex: "sequence",
      key: "sequence",
      width: 90,
      align: "center",
      render: (value: number | undefined, _, index) => value ?? index + 1,
    },
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      width: 140,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      render: (_, record) => <Typography.Text strong>{record.productName}</Typography.Text>,
    },
    {
      title: "Rate",
      dataIndex: "productRate",
      key: "productRate",
      width: 140,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
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
            description="Are you sure you want to delete this dealer product?"
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
              Dealer Products
            </Title>
            <Typography.Text style={{ color: "#64748b" }}>
              {searchText.trim()
                ? "Clear search to drag rows and change saved dealer product sequence."
                : "Drag rows to change saved dealer product sequence."}
            </Typography.Text>
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search MRP, product, rate"
              style={{ width: 300 }}
            />
            <Popconfirm
              title="Delete selected products"
              description={`Are you sure you want to delete ${selectedRowKeys.length} selected product${selectedRowKeys.length === 1 ? "" : "s"}?`}
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
              Add Product
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
            rowClassName={(record) =>
              record._id === draggingId ? "product-row product-row-dragging" : "product-row"
            }
            onRow={(record) => ({
              draggable: !searchText.trim(),
              onDragStart: (event) => {
                if (searchText.trim()) {
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", record._id);
                setDraggingId(record._id);
              },
              onDragOver: (event) => {
                if (searchText.trim()) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              },
              onDrop: (event) => {
                if (searchText.trim()) {
                  return;
                }
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
              Enter MRP, product name and rate
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
              label="MRP"
              name="mrp"
              rules={[{ required: true, message: "Please enter MRP" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                size="large"
                placeholder="Enter MRP"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Rate"
              name="productRate"
              rules={[{ required: true, message: "Please enter rate" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                size="large"
                placeholder="Enter rate"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Product"
              name="productName"
              rules={[{ required: true, message: "Please enter product name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter product name"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Product (Gujarati)"
              name="productNameGujarati"
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="ગુજરાતી પ્રોડક્ટ નામ લખો"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DealerProductsPage;
