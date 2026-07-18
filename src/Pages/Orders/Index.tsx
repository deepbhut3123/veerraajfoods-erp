import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import html2canvas from "html2canvas";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CopyOutlined, EditOutlined } from "@ant-design/icons";
import {
  getAllDealerBills,
  getAllDealerProducts,
  getAllDealers,
  markDealerBillsAsShipped,
  updateDealerBill,
} from "../../Utils/Api";
import "../Bills/Index.css";

const { Title, Text } = Typography;

type DealerBillLineItem = {
  productId?: string | { _id?: string; mrp?: number; productName?: string; productRate?: number } | null;
  mrp?: number;
  productName?: string;
  productRate?: number;
  amount?: number;
  quantity?: number;
  total?: number;
};

type DealerOption = {
  _id: string;
  dealerName: string;
  contactNo?: string;
  city?: string;
};

type DealerProductOption = {
  _id: string;
  mrp: number;
  productName: string;
  productRate: number;
  sequence?: number;
};

type OrderFormValues = {
  dealerId: string;
  billDate: Dayjs;
  items: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

type DealerOrder = {
  _id: string;
  billDate?: string;
  kattaCount?: number;
  totalAmount?: number;
  status?: string;
  items?: DealerBillLineItem[];
  dealerId?: {
    _id?: string;
    dealerName?: string;
    contactNo?: string;
    city?: string;
    margin?: number;
  };
  userId?: {
    name?: string;
    email?: string;
  };
};

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

const formatRoundedCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getProductKey = (item: DealerBillLineItem, index?: number) =>
  (typeof item.productId === "object" ? item.productId?._id : item.productId) ||
  item.productName ||
  `product-${index ?? 0}`;

const getProductMrp = (item: DealerBillLineItem) =>
  Number(item.mrp || (typeof item.productId === "object" ? item.productId?.mrp : 0) || 0);

const getProductId = (item: DealerBillLineItem) =>
  typeof item.productId === "object" ? item.productId?._id : item.productId;

const sortDealerProductsBySequence = (items: DealerProductOption[]) =>
  [...items].sort((left, right) => {
    const leftSequence = Number(left.sequence);
    const rightSequence = Number(right.sequence);
    const normalizedLeft = Number.isFinite(leftSequence) ? leftSequence : Number.MAX_SAFE_INTEGER;
    const normalizedRight = Number.isFinite(rightSequence) ? rightSequence : Number.MAX_SAFE_INTEGER;

    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return left.productName.localeCompare(right.productName);
  });

const OrdersPage: React.FC = () => {
  const [data, setData] = useState<DealerOrder[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [products, setProducts] = useState<DealerProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [activeOrder, setActiveOrder] = useState<DealerOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<DealerOrder | null>(null);
  const [exportOrder, setExportOrder] = useState<DealerOrder | null>(null);
  const [shippingOrder, setShippingOrder] = useState<DealerOrder | null>(null);
  const [shipKattaCount, setShipKattaCount] = useState<number | null>(null);
  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const [form] = Form.useForm<OrderFormValues>();
  const watchedItems = Form.useWatch("items", form);

  const draftTotal = useMemo(
    () =>
      products.reduce((sum, product, index) => {
        const quantity = Number(watchedItems?.[index]?.quantity || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) return sum;
        return sum + quantity * Number(product.productRate || 0);
      }, 0),
    [products, watchedItems],
  );

  const loadOrders = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealerBills({
        search: search.trim() || undefined,
        status: "ordered",
      });
      setData(response?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load dealer orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void loadOrders(debouncedSearchText);
  }, [debouncedSearchText]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [dealerRes, productRes] = await Promise.all([
          getAllDealers(),
          getAllDealerProducts(),
        ]);
        setDealers(dealerRes?.data || []);
        setProducts(sortDealerProductsBySequence(productRes?.data || []));
      } catch (err: any) {
        message.error(err?.response?.data?.message || err?.message || "Failed to load order form data");
      }
    };

    void loadMasterData();
  }, []);

  const openEdit = (record: DealerOrder) => {
    const quantityByProductId = new Map<string, number>();

    (record.items || []).forEach((item) => {
      const productId = getProductId(item);
      const quantity = Number(item.quantity || 0);

      if (productId && Number.isFinite(quantity) && quantity > 0) {
        quantityByProductId.set(productId, quantity);
      }
    });

    setActiveOrder(null);
    setEditingOrder(record);
    form.setFieldsValue({
      dealerId: record.dealerId?._id || "",
      billDate: record.billDate ? dayjs(record.billDate) : dayjs(),
      items: products.map((product) => ({
        productId: product._id,
        quantity: quantityByProductId.get(product._id),
      })),
    });
  };

  const closeEdit = () => {
    setEditingOrder(null);
    form.resetFields();
  };

  const handleEditSubmit = async (values: OrderFormValues) => {
    if (!editingOrder?._id) return;

    const items = products
      .map((product, index) => ({
        productId: product._id,
        productName: product.productName,
        mrp: product.mrp,
        productRate: product.productRate,
        amount: product.productRate,
        quantity: Number(values.items?.[index]?.quantity || 0),
      }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (!items.length) {
      message.error("Please add at least one product quantity");
      return;
    }

    setSaving(true);
    try {
      await updateDealerBill(editingOrder._id, {
        dealerId: values.dealerId,
        billDate: values.billDate.format("YYYY-MM-DD"),
        kattaCount: Number(editingOrder.kattaCount || 0),
        items,
      });
      message.success("Order updated successfully");
      closeEdit();
      await loadOrders(debouncedSearchText);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const copyOrderAsImage = async (order: DealerOrder) => {
    setExportOrder(order);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    if (!exportCardRef.current) {
      message.error("Order image is not ready yet");
      return;
    }

    setCopyingImage(true);

    try {
      const canvas = await html2canvas(exportCardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) throw new Error("Failed to create image");

      if (navigator.clipboard && "write" in navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        message.success("Order image copied to clipboard");
        return;
      }

      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `dealer-order-${order._id}.png`;
      link.click();
      URL.revokeObjectURL(imageUrl);
      message.success("Image download started because clipboard image copy is not supported");
    } catch (err: any) {
      message.error(err?.message || "Failed to copy order image");
    } finally {
      setCopyingImage(false);
      setExportOrder(null);
    }
  };

  const openShipModal = (record: DealerOrder) => {
    setShippingOrder(record);
    setShipKattaCount(Number(record.kattaCount || 0) > 0 ? Number(record.kattaCount) : null);
  };

  const closeShipModal = () => {
    if (shipping) return;
    setShippingOrder(null);
    setShipKattaCount(null);
  };

  const handleShipOrder = async () => {
    const normalizedKatta = Number(shipKattaCount || 0);

    if (!shippingOrder?._id) {
      message.warning("Select one dealer order");
      return;
    }

    if (!Number.isFinite(normalizedKatta) || normalizedKatta <= 0) {
      message.warning("Please enter katta greater than 0");
      return;
    }

    setShipping(true);
    try {
      await markDealerBillsAsShipped([shippingOrder._id], normalizedKatta);
      message.success("Dealer order marked as shipped");
      setActiveOrder(null);
      setShippingOrder(null);
      setShipKattaCount(null);
      await loadOrders(debouncedSearchText);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to ship dealer order");
    } finally {
      setShipping(false);
    }
  };

  const columns: ColumnsType<DealerOrder> = [
    {
      title: "No.",
      width: 80,
      render: (_, record) => data.findIndex((item) => item._id === record._id) + 1,
    },
    {
      title: "Dealer",
      key: "dealer",
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.dealerId?.dealerName || "-"}</Text>
          <Text type="secondary">
            {[record.dealerId?.city, record.dealerId?.contactNo].filter(Boolean).join(" | ") || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Date",
      key: "billDate",
      width: 130,
      render: (_, record) => formatDate(record.billDate),
    },
    {
      title: "Items",
      key: "items",
      width: 100,
      render: (_, record) => record.items?.length || 0,
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 180,
      render: (_, record) => record.userId?.name || record.userId?.email || "-",
    },
    {
      title: "Total",
      key: "totalAmount",
      width: 150,
      render: (_, record) => <Text strong>{formatRoundedCurrency(record.totalAmount)}</Text>,
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: () => <Tag color="orange">Ordered</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 190,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Copy order image">
            <Button
              type="text"
              aria-label="Copy order image"
              icon={<CopyOutlined />}
              loading={copyingImage && exportOrder?._id === record._id}
              onClick={(event) => {
                event.stopPropagation();
                void copyOrderAsImage(record);
              }}
              style={{
                color: THEME.mid,
                borderRadius: 10,
                width: 34,
                height: 34,
              }}
            />
          </Tooltip>
          <Tooltip title="Edit order">
            <Button
              type="text"
              aria-label="Edit order"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(record);
              }}
              style={{
                color: THEME.mid,
                borderRadius: 10,
                width: 34,
                height: 34,
              }}
            />
          </Tooltip>
          <Tooltip title="Mark shipped">
            <Button
              type="text"
              aria-label="Mark shipped"
              icon={<CheckOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                openShipModal(record);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                color: THEME.mid,
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        background: "linear-gradient(180deg, #f6fbfb 0%, #eef6f5 45%, #f8fafc 100%)",
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
              Orders
            </Title>
            <Text type="secondary">Dealer bills created from mobile and waiting for shipping.</Text>
          </div>

          <Space wrap>
            <Input
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search dealer orders..."
              size="large"
              style={{ width: 280, borderRadius: 12 }}
            />
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
            scroll={{ x: "max-content", y: 560 }}
            columns={columns}
            onRow={(record) => ({
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest(".ant-btn")
                ) {
                  return;
                }

                setActiveOrder(record);
              },
            })}
            rowClassName={() => "bill-row bill-row-clickable"}
          />
        )}
      </Card>

      <Modal
        open={Boolean(editingOrder)}
        title="Edit Dealer Order"
        onCancel={closeEdit}
        onOk={() => form.submit()}
        okText="Update"
        confirmLoading={saving}
        width={820}
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
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
                options={dealers.map((dealer) => ({
                  value: dealer._id,
                  label: [dealer.dealerName, dealer.city, dealer.contactNo].filter(Boolean).join(" | "),
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Bill Date"
              name="billDate"
              rules={[{ required: true, message: "Please select bill date" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker size="large" format="DD-MM-YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <div style={{ marginTop: 18 }}>
            <Text strong>Products</Text>
          </div>

          <Table
            style={{ marginTop: 12 }}
            rowKey="_id"
            dataSource={products}
            pagination={false}
            scroll={{ y: 320, x: "max-content" }}
            columns={[
              {
                title: "Product",
                key: "product",
                width: 330,
                render: (_, product) => (
                  <Text strong>
                    {formatRoundedCurrency(product.mrp)} {product.productName}
                  </Text>
                ),
              },
              {
                title: "Qty",
                key: "quantity",
                width: 120,
                render: (_, __, index) => (
                  <Form.Item name={["items", index, "quantity"]} style={{ marginBottom: 0 }}>
                    <InputNumber min={0} precision={0} placeholder="Qty" style={{ width: 90 }} />
                  </Form.Item>
                ),
              },
              {
                title: "Amount",
                key: "amount",
                width: 130,
                render: (_, product) => formatRoundedCurrency(product.productRate),
              },
              {
                title: "Total",
                key: "total",
                width: 150,
                render: (_, product, index) => {
                  const quantity = Number(watchedItems?.[index]?.quantity || 0);
                  return formatRoundedCurrency(quantity * Number(product.productRate || 0));
                },
              },
            ]}
          />

          <div style={{ display: "none" }}>
            {products.map((product, index) => (
              <Form.Item key={product._id} name={["items", index, "productId"]} initialValue={product._id}>
                <Input />
              </Form.Item>
            ))}
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Tag color="green" style={{ margin: 0, borderRadius: 999, padding: "8px 14px", fontWeight: 700 }}>
              Total: {formatRoundedCurrency(draftTotal)}
            </Tag>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(activeOrder)}
        onCancel={() => setActiveOrder(null)}
        footer={null}
        width={920}
        title="Dealer Order Details"
      >
        {activeOrder ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div
              style={{
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 16,
                padding: 18,
                background: "#fff",
              }}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>
                  <Text strong>Dealer : </Text>
                  {activeOrder.dealerId?.dealerName || "-"}
                  {activeOrder.dealerId?.contactNo ? ` - ${activeOrder.dealerId.contactNo}` : ""}
                </Text>
                <Text>
                  <Text strong>City : </Text>
                  {activeOrder.dealerId?.city || "-"}
                </Text>
                <Text>
                  <Text strong>Date : </Text>
                  {formatDate(activeOrder.billDate)}
                </Text>
                <Text>
                  <Text strong>Katta : </Text>
                  {activeOrder.kattaCount ?? 0}
                </Text>
              </Space>

              <Table
                style={{ marginTop: 18 }}
                rowKey={(record, index) => getProductKey(record, index)}
                dataSource={activeOrder.items || []}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: "No order items found" }}
                columns={[
                  {
                    title: "MRP",
                    key: "mrp",
                    width: 130,
                    render: (_, record) => formatRoundedCurrency(getProductMrp(record)),
                  },
                  {
                    title: "Product",
                    key: "productName",
                    render: (_, record) => record.productName || "-",
                  },
                  {
                    title: "Qty",
                    dataIndex: "quantity",
                    key: "quantity",
                    width: 110,
                  },
                  {
                    title: "Amount",
                    key: "amount",
                    render: (_, record) => formatRoundedCurrency(record.amount),
                    width: 130,
                  },
                  {
                    title: "Total",
                    key: "total",
                    render: (_, record) => formatRoundedCurrency(record.total),
                    width: 150,
                  },
                ]}
              />

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                <Tag color="green" style={{ margin: 0, borderRadius: 999, padding: "8px 14px", fontWeight: 700 }}>
                  Total: {formatRoundedCurrency(activeOrder.totalAmount)}
                </Tag>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(shippingOrder)}
        title="Set Katta Before Shipping"
        okText="Submit"
        cancelText="Cancel"
        confirmLoading={shipping}
        onOk={handleShipOrder}
        onCancel={closeShipModal}
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary">
            Enter katta count for {shippingOrder?.dealerId?.dealerName || "this dealer order"}.
          </Text>
          <InputNumber
            min={1}
            precision={0}
            size="large"
            placeholder="Enter katta"
            value={shipKattaCount ?? undefined}
            onChange={(value) => setShipKattaCount(typeof value === "number" ? value : null)}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>

      {exportOrder ? (
        <div
          style={{
            position: "fixed",
            left: -10000,
            top: 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          <div
            ref={exportCardRef}
            style={{
              width: 920,
              background: "#ffffff",
              color: "#111111",
              fontFamily: "\"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif",
              border: "1px solid #d9d9d9",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                borderBottom: "1px solid #d9d9d9",
              }}
            >
              <div
                style={{
                  padding: "16px 18px",
                  borderRight: "1px solid #d9d9d9",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                DEALER NAME : {exportOrder.dealerId?.dealerName || "-"}
              </div>
              <div
                style={{
                  padding: "16px 18px",
                  fontSize: 20,
                  fontWeight: 500,
                  textAlign: "right",
                }}
              >
                DATE : {formatDate(exportOrder.billDate)}
              </div>
            </div>

            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #d9d9d9",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              KATTA : {exportOrder.kattaCount ?? 0}
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {["#", "M.R.P.", "PRODUCT", "QTY", "AMT", "TOTAL"].map((label) => (
                    <th
                      key={label}
                      style={{
                        borderBottom: "1px solid #d9d9d9",
                        borderRight: "1px solid #d9d9d9",
                        padding: "12px 10px",
                        fontSize: 18,
                        fontWeight: 500,
                        textAlign: label === "PRODUCT" ? "left" : "center",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(exportOrder.items || []).map((item, index) => (
                  <tr key={`${getProductKey(item, index)}-${index}`}>
                    <td style={{ borderBottom: "1px solid #ebebeb", borderRight: "1px solid #d9d9d9", padding: "10px 8px", fontSize: 18, textAlign: "center" }}>
                      {index + 1}
                    </td>
                    <td style={{ borderBottom: "1px solid #ebebeb", borderRight: "1px solid #d9d9d9", padding: "10px 8px", fontSize: 18, textAlign: "center" }}>
                      {formatRoundedCurrency(getProductMrp(item))}
                    </td>
                    <td style={{ borderBottom: "1px solid #ebebeb", borderRight: "1px solid #d9d9d9", padding: "10px 18px", fontSize: 18, textAlign: "left" }}>
                      {String(item.productName || "-").toUpperCase()}
                    </td>
                    <td style={{ borderBottom: "1px solid #ebebeb", borderRight: "1px solid #d9d9d9", padding: "10px 8px", fontSize: 18, textAlign: "center" }}>
                      {Number(item.quantity || 0)}
                    </td>
                    <td style={{ borderBottom: "1px solid #ebebeb", borderRight: "1px solid #d9d9d9", padding: "10px 8px", fontSize: 18, textAlign: "center" }}>
                      {formatRoundedCurrency(item.amount)}
                    </td>
                    <td style={{ borderBottom: "1px solid #ebebeb", padding: "10px 8px", fontSize: 18, textAlign: "center" }}>
                      {formatRoundedCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 18,
                padding: "18px",
                borderTop: "1px solid #d9d9d9",
                fontSize: 20,
              }}
            >
              <span style={{ fontWeight: 500 }}>TOTAL AMOUNT</span>
              <span style={{ minWidth: 120, textAlign: "right" }}>
                {formatRoundedCurrency(Number(exportOrder.totalAmount || 0))}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrdersPage;
