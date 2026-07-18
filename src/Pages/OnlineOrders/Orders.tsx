import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { ColumnsType } from "antd/es/table";
import type { Key } from "react";
import dayjs from "dayjs";
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  addOnlineCustomer,
  completeOnlineOrderPayment,
  createOnlineOrder,
  deleteOnlineOrder,
  getAllOnlineCustomers,
  getAllOnlineOrders,
  getOnlineOrderById,
  getAllOnlineProducts,
  markOnlineOrderDelivered,
  updateOnlineOrder,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};
const LABEL_SENDER = {
  name: "VEERRAAJ FOODS",
  city: "AHMEDABAD",
  phone: "90994 00116",
};
const LABEL_LOGO_SRC = `${window.location.origin}/VEERRAJLOGOR.jpg`;
const PAYMENT_FILTER_OPTIONS = [
  { value: "all", label: "All Payment" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "ordered", label: "Ordered" },
  { value: "delivered", label: "Delivered" },
];

type OnlineCustomerItem = {
  _id?: string;
  id?: string;
  name: string;
  phoneNumber: string;
  address: string;
};

type OnlineProductItem = {
  _id?: string;
  id?: string;
  name: string;
  weight: string;
  mrp: number;
  currentStock?: number;
};

type OnlineOrderItem = {
  productId?:
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
  quantity?: number;
  total?: number;
};

type OnlineOrderRow = {
  _id?: string;
  id?: string;
  orderDate: string;
  customerId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        phoneNumber?: string;
        address?: string;
      };
  customerName: string;
  phoneNumber: string;
  address: string;
  status: string;
  totalAmount: number;
  items: OnlineOrderItem[];
  paymentReceived?: boolean;
  paymentAmount?: number;
  paymentType?: string;
  paymentReceivedAt?: string;
};

type OrderFormValues = {
  orderDate: dayjs.Dayjs;
  customerId: string;
  customerName: string;
  address: string;
  items: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

type PaymentFormValues = {
  paymentAmount: number;
  paymentType: string;
};

type CustomerFormValues = {
  name: string;
  phoneNumber: string;
  address: string;
};

type OrderDateRange = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;

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

const getProductIdValue = (productId?: OnlineOrderItem["productId"]) =>
  typeof productId === "object" ? productId?._id || productId?.id || "" : productId || "";

const getCustomerIdValue = (customerId?: OnlineOrderRow["customerId"]) =>
  typeof customerId === "object" ? customerId?._id || customerId?.id || "" : customerId || "";

const getOrderId = (order?: OnlineOrderRow | null) => order?._id || order?.id || "";

const getCustomerRecordId = (customer?: OnlineCustomerItem | null) =>
  String(customer?._id || customer?.id || "");

const normalizeOrderStatus = (status?: string) => status?.trim().toLowerCase() || "unknown";

const formatStatusLabel = (status?: string) =>
  normalizeOrderStatus(status)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const stopRowClick = (event: ReactMouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

const OnlineOrdersPage: React.FC = () => {
  const [data, setData] = useState<OnlineOrderRow[]>([]);
  const [customers, setCustomers] = useState<OnlineCustomerItem[]>([]);
  const [products, setProducts] = useState<OnlineProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<OnlineOrderRow | null>(null);
  const [activeOrder, setActiveOrder] = useState<OnlineOrderRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [form] = Form.useForm<OrderFormValues>();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<OnlineOrderRow | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [paymentForm] = Form.useForm<PaymentFormValues>();
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerForm] = Form.useForm<CustomerFormValues>();
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<OrderDateRange>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fromDate, toDate] = dateRangeFilter || [];
      const response = await getAllOnlineOrders({
        paymentReceived: paymentFilter === "all" ? undefined : paymentFilter === "paid",
        status: statusFilter === "all" ? undefined : statusFilter,
        fromDate: fromDate ? fromDate.format("YYYY-MM-DD") : undefined,
        toDate: toDate ? toDate.format("YYYY-MM-DD") : undefined,
      });
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load online orders");
    } finally {
      setLoading(false);
    }
  }, [dateRangeFilter, paymentFilter, statusFilter]);

  const loadMasterData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        getAllOnlineCustomers(),
        getAllOnlineProducts(),
      ]);

      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : []);
      setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to load order master data",
      );
    }
  };

  useEffect(() => {
    void loadMasterData();
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const currentCustomerId = Form.useWatch("customerId", form);
  const watchedItems = Form.useWatch("items", form);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: getCustomerRecordId(customer),
        label: `${customer.phoneNumber} - ${customer.name}`,
      })),
    [customers],
  );

  const availableBaseMap = useMemo(() => {
    const stockMap = new Map<string, number>();

    products.forEach((product) => {
      const productId = product._id || product.id || "";
      if (!productId) return;
      stockMap.set(productId, Number(product.currentStock || 0));
    });

    if (editingItem) {
      (editingItem.items || []).forEach((item) => {
        const productId = getProductIdValue(item.productId);
        if (!productId) return;
        stockMap.set(productId, Number(stockMap.get(productId) || 0) + Number(item.quantity || 0));
      });
    }

    return stockMap;
  }, [editingItem, products]);

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => getCustomerRecordId(customer) === String(currentCustomerId || ""),
      ),
    [currentCustomerId, customers],
  );

  useEffect(() => {
    if (!currentCustomerId) {
      form.setFieldsValue({
        customerName: "",
        address: "",
      });
      return;
    }

    if (selectedCustomer) {
      form.setFieldsValue({
        customerName: selectedCustomer.name,
        address: selectedCustomer.address,
      });
      return;
    }

    form.setFieldsValue({
      customerName: "",
      address: "",
    });
  }, [currentCustomerId, form, selectedCustomer]);

  useEffect(() => {
    const visibleKeys = new Set(data.map((record) => getOrderId(record)));
    setSelectedRowKeys((keys) => keys.filter((key) => visibleKeys.has(String(key))));
  }, [data]);

  const buildInitialRows = () => [{ productId: undefined, quantity: 1 }];

  const openCreate = () => {
    setEditingItem(null);
    setSaving(false);
    form.resetFields();
    form.setFieldsValue({
      orderDate: dayjs(),
      customerId: undefined,
      customerName: "",
      address: "",
      items: buildInitialRows(),
    });
    setModalOpen(true);
  };

  const openCustomerCreate = () => {
    customerForm.resetFields();
    setCustomerModalOpen(true);
  };

  const fillCustomerDetails = (customer?: OnlineCustomerItem) => {
    form.setFieldsValue({
      customerName: customer?.name || "",
      address: customer?.address || "",
    });
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(
      (entry) => getCustomerRecordId(entry) === String(customerId || ""),
    );
    fillCustomerDetails(customer);
  };

  const openEdit = (item: OnlineOrderRow) => {
    setEditingItem(item);
    setSaving(false);
    form.resetFields();
    form.setFieldsValue({
      orderDate: dayjs(item.orderDate),
      customerId: getCustomerIdValue(item.customerId),
      customerName: item.customerName,
      address: item.address,
      items: (item.items || []).map((orderItem) => ({
        productId: getProductIdValue(orderItem.productId),
        quantity: Number(orderItem.quantity || 0),
      })),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setSaving(false);
    form.resetFields();
  };

  const closeCustomerModal = () => {
    setCustomerModalOpen(false);
    setCustomerSaving(false);
    customerForm.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOnlineOrder(id);
      message.success("Online order deleted successfully");
      await loadOrders();
      await loadMasterData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete online order");
    }
  };

  const handleCustomerSubmit = async (values: CustomerFormValues) => {
    setCustomerSaving(true);

    try {
      const payload = {
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim(),
        address: values.address.trim(),
      };

      const response = await addOnlineCustomer(payload);
      const createdCustomer = response?.data || response;
      const customerId = createdCustomer?._id || createdCustomer?.id || "";

      message.success("Online customer created successfully");
      await loadMasterData();

      if (customerId) {
        form.setFieldsValue({
          customerId,
          customerName: payload.name,
          address: payload.address,
        });
      }

      closeCustomerModal();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save online customer",
      );
      setCustomerSaving(false);
    }
  };

  const handleDelivery = async (order: OnlineOrderRow) => {
    try {
      await markOnlineOrderDelivered(getOrderId(order));
      message.success("Order marked as delivered");
      await loadOrders();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to update delivery status",
      );
    }
  };

  const openPaymentModal = (order: OnlineOrderRow) => {
    setPaymentOrder(order);
    paymentForm.setFieldsValue({
      paymentAmount: Number(order.paymentAmount || order.totalAmount || 0),
      paymentType: order.paymentType || "online",
    });
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentSaving(false);
    setPaymentOrder(null);
    paymentForm.resetFields();
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    if (!paymentOrder) {
      return;
    }

    setPaymentSaving(true);
    try {
      await completeOnlineOrderPayment(getOrderId(paymentOrder), {
        paymentAmount: Number(values.paymentAmount || 0),
        paymentType: String(values.paymentType || "online"),
      });
      message.success("Payment received successfully");
      closePaymentModal();
      await loadOrders();

      if (getOrderId(activeOrder) === getOrderId(paymentOrder)) {
        void getOnlineOrderById(getOrderId(paymentOrder))
          .then((response) => {
            setActiveOrder(response?.data || null);
          })
          .catch(() => undefined);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save payment");
      setPaymentSaving(false);
    }
  };

  const openDetails = (order: OnlineOrderRow) => {
    const orderId = getOrderId(order);
    if (!orderId) {
      message.error("Order id is missing");
      return;
    }

    setDetailsModalOpen(true);
    setDetailsLoading(true);
    void getOnlineOrderById(orderId)
      .then((response) => {
        setActiveOrder(response?.data || null);
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.message || err?.message || "Failed to load order details");
      })
      .finally(() => setDetailsLoading(false));
  };

  const draftRows = useMemo(
    () =>
      (watchedItems || []).map((item, index) => {
        const product = products.find((entry) => (entry._id || entry.id || "") === item?.productId);
        const quantity = Number(item?.quantity || 0);
        const productId = product?._id || product?.id || item?.productId || `row-${index}`;
        const availableQty = Number(availableBaseMap.get(productId) || 0);
        const mrp = Number(product?.mrp || 0);
        return {
          key: `${productId}-${index}`,
          productId,
          name: product?.name || "",
          weight: product?.weight || "",
          mrp,
          quantity,
          availableQty,
          total: mrp * quantity,
          exceeds: quantity > availableQty && Boolean(item?.productId),
        };
      }),
    [availableBaseMap, products, watchedItems],
  );

  const draftTotal = useMemo(
    () => draftRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
    [draftRows],
  );

  const handleSubmit = async (values: OrderFormValues) => {
    setSaving(true);

    try {
      const normalizedItems = (values.items || [])
        .map((item) => {
          const product = products.find((entry) => (entry._id || entry.id || "") === item?.productId);
          const quantity = Number(item?.quantity || 0);
          if (!product || quantity <= 0) {
            return null;
          }

          const productId = product._id || product.id || "";
          const availableQty = Number(availableBaseMap.get(productId) || 0);
          if (quantity > availableQty) {
            throw new Error(`Only ${availableQty} qty available for ${product.name}`);
          }

          return {
            productId,
            quantity,
          };
        })
        .filter((item): item is { productId: string; quantity: number } => Boolean(item));

      if (!values.customerId) {
        message.warning("Please select customer mobile number");
        setSaving(false);
        return;
      }

      if (!normalizedItems.length) {
        message.warning("Please add at least one product with quantity");
        setSaving(false);
        return;
      }

      const payload = {
        orderDate: values.orderDate.format("YYYY-MM-DD"),
        customerId: values.customerId,
        items: normalizedItems,
      };

      if (editingItem) {
        await updateOnlineOrder(getOrderId(editingItem), payload);
        message.success("Online order updated successfully");
      } else {
        await createOnlineOrder(payload);
        message.success("Online order created successfully");
      }

      closeModal();
      await Promise.all([loadOrders(), loadMasterData()]);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save online order");
      setSaving(false);
    }
  };

  const renderPaymentStatus = (record: OnlineOrderRow) => {
    const paymentReceived = Boolean(record.paymentReceived);
    const amount = paymentReceived
      ? Number(record.paymentAmount || record.totalAmount || 0)
      : Number(record.totalAmount || 0);

    return (
      <Space size={8}>
        {paymentReceived ? (
          <CheckCircleFilled style={{ color: "#16a34a", fontSize: 16 }} />
        ) : (
          <CloseCircleFilled style={{ color: "#dc2626", fontSize: 16 }} />
        )}
        <Text strong style={{ color: paymentReceived ? "#16a34a" : "#dc2626" }}>
          {formatCurrency(amount)}
        </Text>
      </Space>
    );
  };

  const handleCopySelected = () => {
    const selectedOrders = data.filter((record) => selectedRowKeys.includes(getOrderId(record)));

    if (!selectedOrders.length) {
      message.warning("Select at least one order to copy");
      return;
    }

    const popup = window.open("", "_blank", "width=1200,height=900");

    if (!popup) {
      message.error("Allow popups to open the order copy sheet");
      return;
    }

    const cardsHtml = selectedOrders
      .map((order) => {
        const customerName = escapeHtml(String(order.customerName || "-").toUpperCase());
        const phoneNumber = escapeHtml(String(order.phoneNumber || "-"));
        const address = escapeHtml(String(order.address || "-").toUpperCase());

        return `
          <article class="copy-label-card">
            <div class="copy-label-body">
              <div class="copy-label-name">${customerName}</div>
              <div class="copy-label-line"><strong>Mobile:</strong> ${phoneNumber}</div>
              <div class="copy-label-line"><strong>Address:</strong> ${address}</div>
            </div>
            <div class="copy-label-footer">
              <img src="${LABEL_LOGO_SRC}" alt="Veerraaj Foods" class="copy-label-logo" />
              <div class="copy-label-from">
                <div><strong>From:</strong> ${escapeHtml(LABEL_SENDER.name)}</div>
                <div>${escapeHtml(`${LABEL_SENDER.city} - ${LABEL_SENDER.phone}`)}</div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Online Order Copy Sheet</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .copy-sheet {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              column-gap: 12px;
              row-gap: 14px;
              align-items: start;
              width: 100%;
            }

            .copy-label-card {
              width: 100%;
              min-height: 140px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 12px 9px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              break-inside: avoid;
              page-break-inside: avoid;
              overflow: hidden;
            }

            .copy-label-body {
              min-height: 88px;
            }

            .copy-label-name {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 10px;
            }

            .copy-label-line {
              font-size: 13px;
              line-height: 1.45;
              margin-bottom: 4px;
              word-break: break-word;
            }

            .copy-label-footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .copy-label-logo {
              width: 56px;
              height: auto;
              object-fit: contain;
              flex-shrink: 0;
            }

            .copy-label-from {
              font-size: 12px;
              line-height: 1.35;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }

            @media screen and (max-width: 900px) {
              .copy-sheet {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <main class="copy-sheet">
            ${cardsHtml}
          </main>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const columns: ColumnsType<OnlineOrderRow> = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "orderDate",
      key: "orderDate",
      render: (value: string) => formatDate(value),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "Mobile",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (value: number) => (
        <Text strong style={{ color: THEME.mid }}>
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Payment",
      key: "payment",
      render: (_, record) => renderPaymentStatus(record),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={normalizeOrderStatus(status) === "delivered" ? "success" : "processing"}>
          {formatStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 156,
      align: "center",
      render: (_, record) => (
        <div
          className="online-order-actions"
          onClick={(event) => stopRowClick(event as unknown as ReactMouseEvent<HTMLElement>)}
        >
          <Tooltip title="Edit order">
            <Button
              type="text"
              size="small"
              className="online-order-action-btn online-order-action-btn--edit"
              aria-label="Edit order"
              onClick={(event) => {
                stopRowClick(event);
                openEdit(record);
              }}
              icon={<EditOutlined />}
            />
          </Tooltip>
          <Tooltip title="Mark delivered">
            <Button
              type="text"
              size="small"
              className="online-order-action-btn online-order-action-btn--deliver"
              aria-label="Mark delivered"
              disabled={record.status === "delivered"}
              onClick={(event) => {
                stopRowClick(event);
                void handleDelivery(record);
              }}
              icon={<CheckOutlined />}
            />
          </Tooltip>
          <Tooltip title="Receive payment">
            <Button
              type="text"
              size="small"
              className="online-order-action-btn online-order-action-btn--payment"
              aria-label="Receive payment"
              disabled={Boolean(record.paymentReceived)}
              onClick={(event) => {
                stopRowClick(event);
                openPaymentModal(record);
              }}
              icon={<WalletOutlined />}
            />
          </Tooltip>
          <Popconfirm
            title="Delete order"
            description="Are you sure you want to delete this order?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(getOrderId(record))}
          >
            <Tooltip title="Delete order">
              <Button
                type="text"
                size="small"
                className="online-order-action-btn online-order-action-btn--delete"
                aria-label="Delete order"
                icon={<DeleteOutlined />}
                onClick={stopRowClick}
              />
            </Tooltip>
          </Popconfirm>
        </div>
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
              Online Orders
            </Title>
            <Text style={{ color: "#64748b" }}>
              Create online orders using customer mobile selection and available online stock.
            </Text>
          </div>
          <Space wrap>
            <Button
              onClick={handleCopySelected}
              disabled={!selectedRowKeys.length}
              icon={<CopyOutlined />}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "1px solid rgba(37, 99, 235, 0.18)",
                color: "#fff",
                fontWeight: 600,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              }}
            >
              Copy Selected
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
              Add Order
            </Button>
          </Space>
        </Space>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="Unable to load orders"
            description={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div className="online-order-filters">
          <Select
            value={paymentFilter}
            onChange={setPaymentFilter}
            options={PAYMENT_FILTER_OPTIONS}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
          />
          <DatePicker.RangePicker
            value={dateRangeFilter}
            onChange={(dates) => setDateRangeFilter(dates as OrderDateRange)}
            format="DD MMM YYYY"
            allowClear
          />
        </div>

        <Table
          className="online-module-table"
          style={{ marginTop: 20 }}
          rowKey={(record) => getOrderId(record)}
          dataSource={data}
          loading={loading}
          pagination={false}
          scroll={{ x: "max-content", y: 420 }}
          columns={columns}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            columnWidth: 56,
          }}
          rowClassName={() => "online-module-row"}
          onRow={(record) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(".ant-table-selection-column") ||
                target.closest("button") ||
                target.closest(".ant-btn") ||
                target.closest(".ant-popover")
              ) {
                return;
              }

              openDetails(record);
            },
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        className="online-module-modal"
        title={editingItem ? "Edit Online Order" : "Add Online Order"}
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
        width={1150}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Date"
            name="orderDate"
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item
            label="Mobile Number"
            name="customerId"
            rules={[{ required: true, message: "Please select mobile number" }]}
          >
            <div className="online-customer-picker">
              <Select
                className="online-customer-picker__select"
                placeholder="Select mobile number"
                options={customerOptions}
                showSearch
                optionFilterProp="label"
                onChange={handleCustomerSelect}
              />
              <Tooltip title="Add customer">
                <Button
                  type="text"
                  className="online-customer-picker__add-btn"
                  icon={<PlusOutlined />}
                  onClick={openCustomerCreate}
                />
              </Tooltip>
            </div>
          </Form.Item>

          <Form.Item label="Customer Name" name="customerName">
            <Input placeholder="Customer name" disabled />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} placeholder="Customer address" disabled />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Table
                  className="online-module-table"
                  rowKey={(record: any) => String(record.key)}
                  pagination={false}
                  dataSource={fields.map((field, index) => ({
                    key: field.key,
                    field,
                    row: draftRows[index],
                  }))}
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
                      key: "productId",
                      render: (_, record: any) => (
                        <Form.Item
                          name={[record.field.name, "productId"]}
                          rules={[{ required: true, message: "Select product" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Select product"
                            options={products.map((product) => ({
                              value: product._id || product.id || "",
                              label: `${product.name} - ${product.weight}`,
                            }))}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: "Weight",
                      key: "weight",
                      render: (_, record: any) => <Text>{record.row?.weight || "-"}</Text>,
                    },
                    {
                      title: "MRP",
                      key: "mrp",
                      render: (_, record: any) => (
                        <Text>{record.row?.mrp ? formatCurrency(record.row.mrp) : "-"}</Text>
                      ),
                    },
                    {
                      title: "Quantity",
                      key: "quantity",
                      render: (_, record: any) => (
                        <Form.Item
                          name={[record.field.name, "quantity"]}
                          rules={[
                            { required: true, message: "Enter qty" },
                            {
                              validator: (_, value) => {
                                const quantity = Number(value || 0);
                                if (quantity <= 0) {
                                  return Promise.reject(new Error("Enter valid qty"));
                                }

                                if (record.row?.productId && quantity > Number(record.row?.availableQty || 0)) {
                                  return Promise.reject(
                                    new Error(`Only ${record.row?.availableQty || 0} qty available`),
                                  );
                                }

                                return Promise.resolve();
                              },
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                          validateStatus={record.row?.exceeds ? "warning" : undefined}
                          help={
                            record.row?.productId
                              ? record.row?.exceeds
                                ? `Only ${record.row?.availableQty || 0} qty available`
                                : `Available: ${record.row?.availableQty || 0}`
                              : undefined
                          }
                        >
                          <InputNumber min={1} style={{ width: 110 }} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: "Total",
                      key: "total",
                      render: (_, record: any) => (
                        <Text strong style={{ color: THEME.mid }}>
                          {formatCurrency(record.row?.total || 0)}
                        </Text>
                      ),
                    },
                    {
                      title: "",
                      key: "remove",
                      width: 70,
                      render: (_, record: any) =>
                        fields.length > 1 ? (
                          <Button type="text" danger onClick={() => remove(record.field.name)}>
                            Remove
                          </Button>
                        ) : null,
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
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  )}
                />

                <Button
                  type="dashed"
                  onClick={() => add({ productId: undefined, quantity: 1 })}
                  style={{ marginTop: 10, borderRadius: 10 }}
                >
                  Add Product Row
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        className="online-module-modal"
        title="Add Customer"
        open={customerModalOpen}
        onCancel={closeCustomerModal}
        onOk={() => customerForm.submit()}
        confirmLoading={customerSaving}
        okText="Save"
        okButtonProps={{
          style: {
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
          },
        }}
        width={560}
        destroyOnClose
      >
        <Form form={customerForm} layout="vertical" onFinish={handleCustomerSubmit}>
          <Form.Item
            label="Customer Name"
            name="name"
            rules={[{ required: true, message: "Please enter customer name" }]}
          >
            <Input placeholder="Enter customer name" />
          </Form.Item>

          <Form.Item
            label="Mobile Number"
            name="phoneNumber"
            rules={[
              { required: true, message: "Please enter mobile number" },
              {
                pattern: /^[0-9]{10}$/,
                message: "Please enter valid 10 digit mobile number",
              },
            ]}
          >
            <Input placeholder="Enter mobile number" maxLength={10} />
          </Form.Item>

          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <Input.TextArea rows={4} placeholder="Enter customer address" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="online-module-modal"
        title="Receive Payment"
        open={paymentModalOpen}
        onCancel={closePaymentModal}
        onOk={() => paymentForm.submit()}
        confirmLoading={paymentSaving}
        okText="Submit"
        okButtonProps={{
          style: {
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
          },
        }}
        width={520}
        destroyOnClose
      >
        <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit}>
          <Form.Item
            label="Payment Amount"
            name="paymentAmount"
            rules={[
              { required: true, message: "Please enter payment amount" },
              {
                validator: (_, value) =>
                  Number(value || 0) > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("Enter valid payment amount")),
              },
            ]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Payment Type"
            name="paymentType"
            initialValue="online"
            rules={[{ required: true, message: "Please select payment type" }]}
          >
            <Select
              options={[
                { label: "Online", value: "online" },
                { label: "Cash", value: "cash" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="online-module-modal"
        title={activeOrder ? `Order Details - ${formatDate(activeOrder.orderDate)}` : "Order Details"}
        open={detailsModalOpen}
        onCancel={() => {
          setDetailsModalOpen(false);
          setActiveOrder(null);
        }}
        footer={null}
        width={1100}
      >
        {activeOrder ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <Card bordered={false} style={{ borderRadius: 16, background: "#f8fafc" }}>
                <Text style={{ color: "#64748b" }}>Customer</Text>
                <Title level={5} style={{ margin: "6px 0 0", color: THEME.dark }}>
                  {activeOrder.customerName}
                </Title>
              </Card>
              <Card bordered={false} style={{ borderRadius: 16, background: "#f8fafc" }}>
                <Text style={{ color: "#64748b" }}>Mobile Number</Text>
                <Title level={5} style={{ margin: "6px 0 0", color: THEME.dark }}>
                  {activeOrder.phoneNumber}
                </Title>
              </Card>
              <Card bordered={false} style={{ borderRadius: 16, background: "#f8fafc" }}>
                <Text style={{ color: "#64748b" }}>Status</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={activeOrder.status === "delivered" ? "success" : "processing"}>
                    {activeOrder.status}
                  </Tag>
                </div>
              </Card>
              <Card bordered={false} style={{ borderRadius: 16, background: "#f8fafc" }}>
                <Text style={{ color: "#64748b" }}>Payment</Text>
                <div style={{ marginTop: 8 }}>{renderPaymentStatus(activeOrder)}</div>
                <Text style={{ color: "#64748b", display: "block", marginTop: 10 }}>
                  Type: {activeOrder.paymentType || "online"}
                </Text>
              </Card>
            </div>

            <Card
              bordered={false}
              style={{ borderRadius: 16, background: "#f8fafc", marginBottom: 20 }}
            >
              <Text style={{ color: "#64748b" }}>Address</Text>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: THEME.dark }}>
                {activeOrder.address || "-"}
              </div>
            </Card>

            <Table
              className="online-module-table"
              rowKey={(record) => getProductIdValue(record.productId) || `${record.name}-${record.weight}`}
              dataSource={(activeOrder.items || []).map((item) => ({
                ...item,
                name: item.name || (typeof item.productId === "object" ? item.productId?.name : ""),
                weight: item.weight || (typeof item.productId === "object" ? item.productId?.weight : ""),
                mrp: Number(item.mrp || (typeof item.productId === "object" ? item.productId?.mrp : 0) || 0),
                quantity: Number(item.quantity || 0),
                total: Number(item.total || 0),
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
                      {formatCurrency(activeOrder.totalAmount)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        ) : (
          <Empty description="No order details available" />
        )}
      </Modal>
    </div>
  );
};

export default OnlineOrdersPage;
