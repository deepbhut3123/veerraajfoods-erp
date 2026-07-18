import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { DeleteOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createOnlineStockEntry,
  deleteOnlineStockEntry,
  getAllOnlineOrders,
  getAllOnlineProducts,
  getAllOnlineStockEntries,
  getOnlineStockEntryById,
  updateOnlineStockEntry,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type OnlineProductItem = {
  _id?: string;
  id?: string;
  name: string;
  weight: string;
  mrp: number;
  currentStock?: number;
};

type OnlineStockEntryItem = {
  productId:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        weight?: string;
        mrp?: number;
      };
  name?: string;
  weight?: string;
  mrp?: number;
  quantity: number;
  total: number;
};

type OnlineStockEntryRow = {
  _id?: string;
  id?: string;
  key?: string;
  entryDate: string;
  totalAmount: number;
  items: OnlineStockEntryItem[];
  createdAt?: string;
  updatedAt?: string;
};

type OnlineOrderRow = {
  items?: Array<{
    productId?:
      | string
      | {
          _id?: string;
          id?: string;
        };
    quantity?: number;
  }>;
};

type OnlineStockFormValues = {
  entryDate: dayjs.Dayjs;
  items: Array<{
    productId: string;
    quantity?: number;
  }>;
};

type LiveStockRow = {
  key: string;
  productName: string;
  weight: string;
  mrp: number;
  quantity: number;
  total: number;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const getEntryId = (entry?: OnlineStockEntryRow | null) =>
  entry?._id || entry?.id || entry?.key || "";

const getProductIdValue = (productId?: OnlineStockEntryItem["productId"]) =>
  typeof productId === "object" ? productId?._id || productId?.id || "" : productId || "";

const OnlineStockPage: React.FC = () => {
  const [data, setData] = useState<OnlineStockEntryRow[]>([]);
  const [products, setProducts] = useState<OnlineProductItem[]>([]);
  const [orders, setOrders] = useState<OnlineOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<OnlineStockEntryRow | null>(null);
  const [activeEntry, setActiveEntry] = useState<OnlineStockEntryRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [entryDetailsModalOpen, setEntryDetailsModalOpen] = useState(false);
  const [liveStockModalOpen, setLiveStockModalOpen] = useState(false);
  const [form] = Form.useForm<OnlineStockFormValues>();

  const loadProducts = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        getAllOnlineProducts(),
        getAllOnlineOrders(),
      ]);
      setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
      setOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to load online stock master data",
      );
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await getAllOnlineStockEntries();
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to load online stock entries",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  useEffect(() => {
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
    setSaving(false);
    form.resetFields();
    form.setFieldsValue({
      entryDate: dayjs(),
      items: buildInitialProductRows(),
    });
    setModalOpen(true);
  };

  const openEdit = (entry: OnlineStockEntryRow) => {
    const entryId = getEntryId(entry);

    if (!entryId) {
      message.error("Stock entry id is missing");
      return;
    }

    const loadEntry = async () => {
      setSaving(true);
      try {
        const response = await getOnlineStockEntryById(entryId);
        const currentEntry = response?.data as OnlineStockEntryRow;
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
        message.error(
          err?.response?.data?.message || err?.message || "Failed to load online stock entry",
        );
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

  const handleDelete = async (entry: OnlineStockEntryRow) => {
    try {
      const entryId = getEntryId(entry);
      await deleteOnlineStockEntry(entryId);

      if (getEntryId(activeEntry) === entryId) {
        setActiveEntry(null);
      }

      message.success("Online stock entry deleted successfully");
      await Promise.all([loadEntries(), loadProducts()]);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete online stock entry",
      );
    }
  };

  const openEntryDetails = (entry: OnlineStockEntryRow) => {
    const entryId = getEntryId(entry);
    if (!entryId) {
      message.error("Stock entry id is missing");
      return;
    }

    setDetailsLoading(true);
    setEntryDetailsModalOpen(true);
    void getOnlineStockEntryById(entryId)
      .then((response) => {
        setActiveEntry(response?.data || null);
      })
      .catch((err: any) => {
        message.error(
          err?.response?.data?.message || err?.message || "Failed to load stock details",
        );
      })
      .finally(() => setDetailsLoading(false));
  };

  const handleSubmit = async (values: OnlineStockFormValues) => {
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
        await updateOnlineStockEntry(getEntryId(editingItem), payload);
        message.success("Online stock entry updated successfully");
      } else {
        await createOnlineStockEntry(payload);
        message.success("Online stock entry created successfully");
      }

      setModalOpen(false);
      setEditingItem(null);
      setSaving(false);
      form.resetFields();
      void Promise.all([loadEntries(), loadProducts()]);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save online stock entry",
      );
      setSaving(false);
    }
  };

  const watchedItems = Form.useWatch("items", form);

  const draftRows = useMemo(
    () =>
      products.map((product) => {
        const productId = product._id || product.id || "";
        const matched = (watchedItems || []).find((item) => item?.productId === productId);
        const quantity = Number(matched?.quantity || 0);
        return {
          key: productId,
          productId,
          name: product.name,
          weight: product.weight,
          mrp: Number(product.mrp || 0),
          quantity,
          total: Number(product.mrp || 0) * quantity,
        };
      }),
    [products, watchedItems],
  );

  const draftTotal = useMemo(
    () => draftRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
    [draftRows],
  );

  const liveStockRows = useMemo<LiveStockRow[]>(() => {
    const quantityMap = new Map<string, number>();

    data.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const productId = getProductIdValue(item.productId);
        if (!productId) return;
        quantityMap.set(productId, Number(quantityMap.get(productId) || 0) + Number(item.quantity || 0));
      });
    });

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const productId =
          typeof item.productId === "object"
            ? item.productId?._id || item.productId?.id || ""
            : item.productId || "";
        if (!productId) return;
        quantityMap.set(productId, Number(quantityMap.get(productId) || 0) - Number(item.quantity || 0));
      });
    });

    return products.map((product) => {
      const productId = product._id || product.id || "";
      const quantity = Math.max(0, Number(quantityMap.get(productId) || 0));
      const mrp = Number(product.mrp || 0);
      return {
        key: productId,
        productName: product.name,
        weight: product.weight,
        mrp,
        quantity,
        total: quantity * mrp,
      };
    });
  }, [data, orders, products]);

  const liveStockTotalUnits = useMemo(
    () => liveStockRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [liveStockRows],
  );

  const liveStockTotalAmount = useMemo(
    () => liveStockRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
    [liveStockRows],
  );

  const liveStockColumns: ColumnsType<LiveStockRow> = [
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
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
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Live Qty",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Available Amount",
      dataIndex: "total",
      key: "total",
      render: (value: number) => (
        <Text strong style={{ color: THEME.mid }}>
          {formatCurrency(value)}
        </Text>
      ),
    },
  ];

  const columns: ColumnsType<OnlineStockEntryRow> = [
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
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View details">
            <Button
              type="text"
              aria-label="View stock details"
              onClick={() => openEntryDetails(record)}
              icon={<EyeOutlined />}
              style={{
                color: "#2563eb",
                borderRadius: 10,
                width: 36,
                height: 36,
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete stock"
            description="Are you sure you want to delete this stock record?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="Delete stock">
              <Button
                type="text"
                aria-label="Delete stock"
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
              Online Stock
            </Title>
            <Text style={{ color: "#64748b" }}>
              Add date-wise online stock entries and track current live stock product-wise.
            </Text>
          </div>
          <Space wrap>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setLiveStockModalOpen(true)}
              style={{
                height: 40,
                borderRadius: 12,
                color: THEME.mid,
                borderColor: "rgba(0, 105, 92, 0.22)",
                fontWeight: 600,
              }}
            >
              View Stock
            </Button>
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
              Add Stock
            </Button>
          </Space>
        </Space>

        <Space direction="vertical" size={16} style={{ width: "100%", marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(0, 105, 92, 0.08)",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Text style={{ display: "block", color: "#64748b", marginBottom: 6 }}>
                Live Stock Units
              </Text>
              <Title level={3} style={{ margin: 0, color: THEME.dark }}>
                {liveStockTotalUnits}
              </Title>
            </Card>
            <Card
              bordered={false}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(0, 105, 92, 0.08)",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Text style={{ display: "block", color: "#64748b", marginBottom: 6 }}>
                Available Stock Amount
              </Text>
              <Title level={3} style={{ margin: 0, color: THEME.dark }}>
                {formatCurrency(liveStockTotalAmount)}
              </Title>
            </Card>
          </div>
        </Space>

        <Table
          className="online-module-table"
          style={{ marginTop: 20 }}
          rowKey={(record) => getEntryId(record)}
          dataSource={data}
          loading={loading}
          pagination={false}
          scroll={{ x: "max-content", y: 360 }}
          columns={columns}
          rowClassName={() => "online-module-row"}
        />
      </Card>

      <Modal
        className="online-module-modal"
        title={editingItem ? "Edit Online Stock" : "Add Online Stock"}
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
        width={1100}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Date"
            name="entryDate"
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Table
            className="online-module-table"
            rowKey="productId"
            dataSource={draftRows}
            pagination={false}
            columns={[
              {
                title: "#",
                key: "serial",
                width: 72,
                align: "center",
                render: (_, __, index) => index + 1,
              },
              {
                title: "Product Name",
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
                render: (value: number) => formatCurrency(value),
              },
              {
                title: "Quantity",
                key: "quantity",
                render: (_, record, index) => (
                  <Form.Item
                    name={["items", index, "quantity"]}
                    initialValue={record.quantity}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} style={{ width: 110 }} />
                  </Form.Item>
                ),
              },
              {
                title: "Total",
                dataIndex: "total",
                key: "total",
                render: (value: number) => (
                  <Text strong style={{ color: THEME.mid }}>
                    {formatCurrency(value)}
                  </Text>
                ),
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <Text strong>Total Amount</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ color: THEME.mid }}>
                    {formatCurrency(draftTotal)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          {(draftRows || []).map((row, index) => (
            <Form.Item
              key={row.productId}
              name={["items", index, "productId"]}
              initialValue={row.productId}
              hidden
            >
              <input type="hidden" />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <Modal
        className="online-module-modal"
        title="Available Stock Details"
        open={liveStockModalOpen}
        onCancel={() => setLiveStockModalOpen(false)}
        footer={null}
        width={1100}
      >
        <Table
          className="online-module-table"
          rowKey="key"
          dataSource={liveStockRows}
          pagination={false}
          columns={liveStockColumns}
          rowClassName={() => "online-module-row"}
        />
      </Modal>

      <Modal
        className="online-module-modal"
        title={activeEntry ? `Stock Details - ${formatDate(activeEntry.entryDate)}` : "Stock Details"}
        open={entryDetailsModalOpen}
        onCancel={() => {
          setEntryDetailsModalOpen(false);
          setActiveEntry(null);
        }}
        footer={null}
        width={1100}
      >
        {activeEntry ? (
          <Table
            className="online-module-table"
            rowKey={(record) => getProductIdValue(record.productId) || `${record.name}-${record.weight}`}
            dataSource={(activeEntry.items || []).map((item) => ({
              ...item,
              name: item.name || (typeof item.productId === "object" ? item.productId?.name : ""),
              weight: item.weight || (typeof item.productId === "object" ? item.productId?.weight : ""),
              mrp: Number(item.mrp || (typeof item.productId === "object" ? item.productId?.mrp : 0) || 0),
            }))}
            loading={detailsLoading}
            pagination={false}
            columns={[
              {
                title: "#",
                key: "serial",
                width: 72,
                align: "center",
                render: (_, __, index) => index + 1,
              },
              { title: "Product Name", dataIndex: "name", key: "name" },
              { title: "Weight", dataIndex: "weight", key: "weight" },
              {
                title: "MRP",
                dataIndex: "mrp",
                key: "mrp",
                render: (value: number) => formatCurrency(value),
              },
              {
                title: "Quantity",
                dataIndex: "quantity",
                key: "quantity",
                align: "center",
              },
              {
                title: "Total",
                dataIndex: "total",
                key: "total",
                render: (value: number) => (
                  <Text strong style={{ color: THEME.mid }}>
                    {formatCurrency(value)}
                  </Text>
                ),
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <Text strong>Total Amount</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ color: THEME.mid }}>
                    {formatCurrency(activeEntry.totalAmount)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        ) : (
          <Empty description="No stock details available" />
        )}
      </Modal>
    </div>
  );
};

export default OnlineStockPage;
