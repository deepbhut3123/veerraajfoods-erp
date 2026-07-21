import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
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
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createAdminStockEntry,
  deleteAdminStockEntry,
  getAdminStockEntryById,
  getAllAdminStockEntries,
  getAllProducts,
  updateAdminStockEntry,
} from "../../Utils/Api";

const { Title, Text } = Typography;

type ProductOption = {
  _id?: string;
  id?: string;
  productName: string;
  productNameGujarati?: string;
  mrp: number;
  productRate: number;
};

type StockEntryItem = {
  productId: string | { _id?: string; id?: string; productName?: string; productNameGujarati?: string; mrp?: number; productRate?: number };
  productName: string;
  mrp: number;
  productRate: number;
  quantity: number;
  total: number;
};

type StockEntryRow = {
  _id?: string;
  id?: string;
  key?: string;
  entryDate: string;
  totalAmount: number;
  items: StockEntryItem[];
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
    roleId?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type StockEntryFormValues = {
  entryDate: dayjs.Dayjs;
  items: Array<{
    productId: string;
    quantity?: number;
  }>;
};

const THEME = {
  dark: "#0f3d3e",
  mid: "#00695C",
};

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

const getEntryId = (entry?: StockEntryRow | null) => entry?._id || entry?.id || entry?.key || "";
const getProductIdValue = (productId?: StockEntryItem["productId"]) =>
  typeof productId === "object" ? productId?._id || productId?.id || "" : productId || "";

const getProductLabel = (product?: { productName?: string; productNameGujarati?: string }) =>
  product?.productName || "-";

const StocksEntriesPage: React.FC = () => {
  const [data, setData] = useState<StockEntryRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<StockEntryRow | null>(null);
  const [activeEntry, setActiveEntry] = useState<StockEntryRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [form] = Form.useForm<StockEntryFormValues>();

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await getAllAdminStockEntries();
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load stock entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await getAllProducts();
        setProducts(Array.isArray(response?.data) ? response.data : []);
      } catch (err: any) {
        message.error(
          err?.response?.data?.message || err?.message || "Failed to load retailer products",
        );
      }
    };

    void loadProducts();
  }, []);

  const resolveProduct = useCallback(
    (productId?: string) =>
      products.find((product) => (product._id || product.id || "") === productId),
    [products],
  );

  const buildInitialProductRows = () =>
    products.map((product) => ({
      productId: product._id || product.id || "",
      quantity: 0,
    }));

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      entryDate: dayjs(),
      items: buildInitialProductRows(),
    });
    setModalOpen(true);
  };

  const openEdit = (entry: StockEntryRow) => {
    const entryId = getEntryId(entry);

    if (!entryId) {
      message.error("Stock entry id is missing");
      return;
    }

    const loadEntry = async () => {
      setSaving(true);
      try {
        const response = await getAdminStockEntryById(entryId);
        const currentEntry = response?.data as StockEntryRow;
        const quantityMap = new Map(
          (currentEntry?.items || []).map((item) => [getProductIdValue(item.productId), item.quantity]),
        );

        setEditingItem(currentEntry);
        form.setFieldsValue({
          entryDate: dayjs(currentEntry.entryDate),
          items: products.map((product) => {
            const productId = product._id || product.id || "";
            return {
              productId,
              quantity: quantityMap.get(productId) || 0,
            };
          }),
        });
        setModalOpen(true);
      } catch (err: any) {
        message.error(err?.response?.data?.message || err?.message || "Failed to load stock entry");
      } finally {
        setSaving(false);
      }
    };

    void loadEntry();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setSaving(false);
    form.resetFields();
  };

  const handleSubmit = async (values: StockEntryFormValues) => {
    setSaving(true);

    try {
      const normalizedItems = (values.items || [])
        .map((item) => {
          const product = resolveProduct(item.productId);
          const quantity = Number(item.quantity || 0);

          if (!product || quantity <= 0) {
            return null;
          }

          return {
            productId: product._id || product.id || "",
            quantity,
          };
        })
        .filter((item): item is { productId: string; quantity: number } => Boolean(item));

      if (!normalizedItems.length) {
        message.warning("Please enter quantity for at least one product");
        setSaving(false);
        return;
      }

      const payload = {
        entryDate: values.entryDate.format("YYYY-MM-DD"),
        items: normalizedItems,
      };

      if (editingItem) {
        await updateAdminStockEntry(getEntryId(editingItem), payload);
        message.success("Stock entry updated successfully");
      } else {
        await createAdminStockEntry(payload);
        message.success("Stock entry created successfully");
      }

      await loadEntries();
      closeModal();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save stock entry");
      setSaving(false);
    }
  };

  const handleDelete = async (entry: StockEntryRow) => {
    try {
      const entryId = getEntryId(entry);
      await deleteAdminStockEntry(entryId);

      if (getEntryId(activeEntry) === entryId) {
        setActiveEntry(null);
      }

      message.success("Stock entry deleted successfully");
      await loadEntries();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete stock entry");
    }
  };

  const watchedItems = Form.useWatch("items", form);

  const draftTotal = useMemo(
    () =>
      (watchedItems || []).reduce((sum: number, item: { productId?: string; quantity?: number }) => {
        const product = resolveProduct(item?.productId);
        const quantity = Number(item?.quantity || 0);
        return sum + (product ? Number(product.productRate || 0) * quantity : 0);
      }, 0),
    [resolveProduct, watchedItems],
  );

  const columns: ColumnsType<StockEntryRow> = [
    {
      title: "#",
      key: "serial",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "entryDate",
      key: "entryDate",
      render: (value) => <Text strong>{formatDate(value)}</Text>,
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 220,
      render: (value) => (
        <Text strong style={{ color: THEME.mid }}>
          {formatCurrency(value)}
        </Text>
      ),
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
              aria-label="Edit entry"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(record);
              }}
              style={{ color: THEME.mid, borderRadius: 10, width: 36, height: 36 }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete stock entry"
            description="Are you sure you want to delete this stock entry?"
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
                aria-label="Delete entry"
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

  return (
    <div
      style={{
        padding: 20,
        minHeight: "calc(100vh - 50px)",
        background: "linear-gradient(180deg, #f6fbfb 0%, #eef6f5 45%, #f8fafc 100%)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          border: "1px solid rgba(0, 105, 92, 0.08)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
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
              Stocks Entry
            </Title>
            <Text type="secondary">
              Daily stock entries using retailer products with saved backend records.
            </Text>
          </div>

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
              boxShadow: "0 12px 24px rgba(0, 105, 92, 0.18)",
            }}
          >
            Add Daily Entry
          </Button>
        </Space>

        <Table
          rowKey={(record) => getEntryId(record)}
          dataSource={data}
          columns={columns}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No stock entries found" /> }}
          scroll={{ x: "max-content", y: 520 }}
          onRow={(record) => ({
            onClick: () => {
              const entryId = getEntryId(record);
              if (!entryId) {
                return;
              }

              setDetailsLoading(true);
              void getAdminStockEntryById(entryId)
                .then((response) => {
                  setActiveEntry(response?.data || null);
                })
                .catch((err: any) => {
                  message.error(
                    err?.response?.data?.message || err?.message || "Failed to load stock entry details",
                  );
                })
                .finally(() => setDetailsLoading(false));
            },
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Stock Entry" : "Add Stock Entry"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Select date first, then enter quantities for retailer products.
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
        width={980}
        centered
        destroyOnClose
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
          <Form.Item
            label="Entry Date"
            name="entryDate"
            rules={[{ required: true, message: "Please select entry date" }]}
            style={{ marginBottom: 18 }}
          >
            <DatePicker size="large" style={{ width: 260 }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.List name="items">
            {(fields) => (
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "130px 1.5fr 130px 120px 130px",
                    gap: 12,
                    padding: "0 4px",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  <span>MRP</span>
                  <span>Product Name</span>
                  <span>Rate</span>
                  <span>Quantity</span>
                  <span>Total</span>
                </div>

                {fields.map((field, index) => {
                  const productId = watchedItems?.[index]?.productId;
                  const quantity = Number(watchedItems?.[index]?.quantity || 0);
                  const product = resolveProduct(productId);
                  const lineTotal = Number(product?.productRate || 0) * quantity;

                  return (
                    <div
                      key={field.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "130px 1.5fr 130px 120px 130px",
                        gap: 12,
                        alignItems: "center",
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid rgba(0, 105, 92, 0.08)",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
                      }}
                    >
                      <div>
                        <Text strong>{product ? formatCurrency(product.mrp) : "-"}</Text>
                      </div>

                      <Form.Item {...field} name={[field.name, "productId"]} style={{ marginBottom: 0 }} hidden>
                        <InputNumber />
                      </Form.Item>

                      <div>
                        <Text strong>{getProductLabel(product)}</Text>
                      </div>

                      <div>
                        <Text strong>{product ? formatCurrency(product.productRate) : "-"}</Text>
                      </div>

                      <Form.Item
                        {...field}
                        name={[field.name, "quantity"]}
                        rules={[{ required: true, message: "Qty" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber size="large" min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <div>
                        <Text strong style={{ color: THEME.mid }}>
                          {formatCurrency(lineTotal)}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Form.List>

          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(0, 105, 92, 0.06)",
              border: "1px solid rgba(0, 105, 92, 0.12)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Text strong style={{ fontSize: 16, color: THEME.mid }}>
              Total: {formatCurrency(draftTotal)}
            </Text>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(activeEntry)}
        onCancel={() => setActiveEntry(null)}
        footer={null}
        width={980}
        title="Stock Entry Details"
      >
        {detailsLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Text>Loading stock entry details...</Text>
          </div>
        ) : activeEntry ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div
              style={{
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 16,
                padding: 18,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
                  paddingBottom: 14,
                }}
              >
                <div>
                  <Text type="secondary">Entry No</Text>
                  <div>
                    <Text strong style={{ fontSize: 18 }}>
                      {data.findIndex((entry) => getEntryId(entry) === getEntryId(activeEntry)) + 1}
                    </Text>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Text type="secondary">Entry Date</Text>
                  <div>
                    <Text strong>{formatDate(activeEntry.entryDate)}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Table
                  rowKey={(record, index) => getProductIdValue(record.productId) || `item-${index}`}
                  dataSource={activeEntry.items}
                  pagination={false}
                  locale={{ emptyText: "No stock items found" }}
                  scroll={{ x: "max-content" }}
                  columns={[
                    {
                      title: "#",
                      key: "sequence",
                      width: 70,
                      align: "center",
                      render: (_, __, index) => index + 1,
                    },
                    {
                      title: "MRP",
                      key: "mrp",
                      width: 130,
                      render: (_, record) => formatCurrency(record.mrp),
                    },
                    {
                      title: "Product",
                      dataIndex: "productName",
                      key: "productName",
                    },
                    {
                      title: "Rate",
                      key: "productRate",
                      width: 130,
                      render: (_, record) => formatCurrency(record.productRate),
                    },
                    {
                      title: "Qty",
                      dataIndex: "quantity",
                      key: "quantity",
                      width: 110,
                    },
                    {
                      title: "Total",
                      key: "total",
                      width: 160,
                      render: (_, record) => formatCurrency(record.total),
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 105, 92, 0.15)",
                    background: "rgba(0, 105, 92, 0.06)",
                  }}
                >
                  <Text strong>Total Amount : {formatCurrency(activeEntry.totalAmount)}</Text>
                </div>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default StocksEntriesPage;
