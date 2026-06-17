import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
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
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addAdminBill,
  bulkDeleteAdminBills,
  deleteAdminBill,
  getAllAdminBills,
  getAllAdminRoutes,
  getAllAdminShops,
  getAllProducts,
  markAdminBillsAsCompleted,
  updateAdminBill,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;

type BillProductRef = {
  _id?: string;
  mrp?: number;
  productName?: string;
  productRate?: number;
};

type BillLineItem = {
  productId?: string | BillProductRef;
  productName?: string;
  productRate?: number;
  quantity?: number;
  total?: number;
};

type BillItem = {
  _id?: string;
  id?: string;
  billNo?: string;
  invoiceNo?: string;
  billNumber?: string;
  customerName?: string;
  partyName?: string;
  shopName?: string;
  amount?: number;
  billAmount?: number;
  totalAmount?: number;
  grandTotal?: number;
  netAmount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: BillLineItem[];
  shopId?: {
    _id?: string;
    shopName?: string;
    shopAddress?: string;
    mobileNumber?: string;
  };
  routeId?: {
    _id?: string;
    routeName?: string;
    cityName?: string;
  };
  customerId?: {
    name?: string;
  };
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  };
};

type StatusStyle = {
  label: string;
  color: string;
  background: string;
  border: string;
};

type SummaryRow = {
  productName: string;
  mrp: number;
  productRate: number;
  quantity: number;
  total: number;
};

type AdminRoute = {
  _id: string;
  routeName: string;
  cityName: string;
};

type AdminShop = {
  _id: string;
  shopName?: string;
  shopAddress?: string;
  mobileNumber?: string;
  routeId?: {
    _id?: string;
    routeName?: string;
    cityName?: string;
  };
};

type ProductOption = {
  _id: string;
  productName: string;
  mrp?: number;
  productRate?: number;
};

type BillFormValues = {
  routeId: string;
  shopId: string;
  items: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

const formatCurrency = (value?: number) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const normalizeStatus = (status?: string) => status?.trim().toLowerCase() || "unknown";

const statusMeta = (status?: string): StatusStyle => {
  const normalized = normalizeStatus(status);

  if (["complete", "completed", "order complete", "order completed", "settled"].includes(normalized)) {
    return {
      label: "Completed",
      color: "#0f766e",
      background: "rgba(0, 105, 92, 0.08)",
      border: "rgba(0, 105, 92, 0.18)",
    };
  }

  if (["pending", "open", "unpaid", "due"].includes(normalized)) {
    return {
      label: "Pending",
      color: "#b45309",
      background: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.2)",
    };
  }

  if (["partial", "partially paid", "partially_paid"].includes(normalized)) {
    return {
      label: "Partial",
      color: "#1d4ed8",
      background: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.2)",
    };
  }

  if (["overdue", "late"].includes(normalized)) {
    return {
      label: "Overdue",
      color: "#b91c1c",
      background: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.18)",
    };
  }

  if (["cancelled", "canceled", "void"].includes(normalized)) {
    return {
      label: "Cancelled",
      color: "#475569",
      background: "rgba(100, 116, 139, 0.12)",
      border: "rgba(100, 116, 139, 0.2)",
    };
  }

  if (["shipped"].includes(normalized)) {
    return {
      label: "Shipped",
      color: "#6d28d9",
      background: "rgba(139, 92, 246, 0.12)",
      border: "rgba(139, 92, 246, 0.2)",
    };
  }

  return {
    label: status ? status : "Unknown",
    color: "#475569",
    background: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.2)",
  };
};

const getPartyName = (record: BillItem) =>
  record.customerName ||
  record.partyName ||
  record.shopName ||
  record.shopId?.shopName ||
  record.customerId?.name ||
  "-";

const getBillAmount = (record: BillItem) =>
  record.amount ?? record.billAmount ?? record.totalAmount ?? record.grandTotal ?? record.netAmount ?? 0;

const getRecordKey = (record: BillItem, index?: number) =>
  record._id || record.id || `bill-${index ?? 0}`;

const getBillSequence = (records: BillItem[], record: BillItem) =>
  records.findIndex((item, index) => getRecordKey(item, index) === getRecordKey(record)) + 1;

const getProductMrp = (item: BillLineItem) =>
  typeof item.productId === "object" ? Number(item.productId?.mrp || 0) : 0;

const getProductKey = (item: BillLineItem, index?: number) =>
  (typeof item.productId === "object" ? item.productId?._id : item.productId) ||
  item.productName ||
  `product-${index ?? 0}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const BillsPage: React.FC = () => {
  const [data, setData] = useState<BillItem[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [activeBill, setActiveBill] = useState<BillItem | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [form] = Form.useForm<BillFormValues>();
  const currentUserRoleId = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("authData") || "{}");
    return stored?.user?.roleId;
  }, []);
  const watchedItems = Form.useWatch("items", form) || [];

  const loadBills = async (search?: string) => {
    setLoading(true);
    setError("");

    try {
      const billsRes = await getAllAdminBills({
        search: search?.trim() || undefined,
      });
      setData(billsRes?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [routesRes, shopsRes, productsRes] = await Promise.all([
          getAllAdminRoutes(),
          getAllAdminShops(),
          getAllProducts(),
        ]);
        setRoutes(routesRes?.data || []);
        setShops(shopsRes?.data || []);
        setProducts(productsRes?.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to load bill form data",
        );
      }
    };

    void loadStaticData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void loadBills(debouncedSearchText);
  }, [debouncedSearchText]);

  const selectedRouteId = Form.useWatch("routeId", form);

  const filteredShops = useMemo(
    () =>
      shops.filter((shop) =>
        selectedRouteId
          ? shop.routeId?._id === selectedRouteId
          : true,
      ),
    [selectedRouteId, shops],
  );

  const canEditBill = (record: BillItem) =>
    currentUserRoleId === 1 || normalizeStatus(record.status) === "ordered";
  const canDeleteBill = (record: BillItem) =>
    currentUserRoleId === 1 || normalizeStatus(record.status) === "ordered";

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      items: products.map((product) => ({
        productId: product._id,
        quantity: undefined,
      })),
    });
    setModalOpen(true);
  };

  const openEdit = (item: BillItem) => {
    const quantityByProductId = new Map(
      (item.items || []).map((line) => [
        typeof line.productId === "object" ? line.productId?._id : line.productId,
        line.quantity,
      ]),
    );

    setEditingItem(item);
    form.setFieldsValue({
      routeId: item.routeId?._id,
      shopId: item.shopId?._id,
      items: products.map((product) => ({
        productId: product._id,
        quantity: quantityByProductId.get(product._id),
      })),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleRouteChange = () => {
    form.setFieldValue("shopId", undefined);
  };

  const billDraftTotal = useMemo(() => {
    return products.reduce((sum, product, index) => {
      const quantity = Number(watchedItems?.[index]?.quantity || 0);
      const rate = Number(product.productRate || 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + quantity * rate;
    }, 0);
  }, [products, watchedItems]);

  const handleSubmit = async (values: BillFormValues) => {
    setSaving(true);

    try {
      const payload = {
        routeId: values.routeId,
        shopId: values.shopId,
        items: (values.items || [])
          .filter((item) => item.productId && Number(item.quantity) > 0)
          .map((item) => ({
            productId: String(item.productId),
            quantity: Number(item.quantity),
          })),
      };

      if (editingItem?._id) {
        await updateAdminBill(editingItem._id, payload);
        message.success("Bill updated successfully");
      } else {
        await addAdminBill(payload);
        message.success("Bill created successfully");
      }

      closeModal();
      await loadBills();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save bill",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminBill(id);
      message.success("Bill deleted successfully");
      if (activeBill?._id === id) {
        setActiveBill(null);
      }
      await loadBills();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete bill",
      );
    }
  };

  const handleBulkDelete = async () => {
    const billIds = selectedRowKeys.map(String).filter(Boolean);

    if (!billIds.length) {
      message.warning("Select at least one bill to delete");
      return;
    }

    setBulkDeleting(true);
    try {
      await bulkDeleteAdminBills(billIds);
      message.success("Selected bills deleted successfully");
      setSelectedRowKeys([]);
      if (activeBill) {
        const activeId = activeBill._id || activeBill.id || "";
        if (billIds.includes(activeId)) {
          setActiveBill(null);
        }
      }
      await loadBills();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete selected bills",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCompleteOrders = async () => {
    const billIds = selectedRowKeys.map(String).filter(Boolean);

    if (!billIds.length) {
      message.warning("Select at least one bill to complete");
      return;
    }

    setCompleting(true);
    try {
      await markAdminBillsAsCompleted(billIds);
      message.success("Selected bills marked as completed");
      setSelectedRowKeys([]);
      await loadBills();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to complete selected bills",
      );
    } finally {
      setCompleting(false);
    }
  };

  const itemColumns: ColumnsType<BillLineItem> = [
    {
      title: "MRP",
      key: "mrp",
      render: (_, record) => formatCurrency(getProductMrp(record)),
    },
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      render: (value) => value || "-",
    },
    {
      title: "Rate",
      key: "productRate",
      render: (_, record) => formatCurrency(record.productRate),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      render: (value) => value ?? "-",
    },
    {
      title: "Total",
      key: "total",
      render: (_, record) => (
        <Tag color="green" style={{ borderRadius: 999, margin: 0 }}>
          {formatCurrency(record.total)}
        </Tag>
      ),
    },
  ];

  const buildSummaryRows = (selectedBills: BillItem[]) => {
    const summaryMap = new Map<string, SummaryRow>();

    selectedBills.forEach((bill) => {
      (bill.items || []).forEach((item, index) => {
        const key = getProductKey(item, index);
        const existing = summaryMap.get(key) || {
          productName:
            item.productName ||
            (typeof item.productId === "object" ? item.productId?.productName || "-" : "-"),
          mrp: getProductMrp(item),
          productRate: Number(item.productRate || 0),
          quantity: 0,
          total: 0,
        };

        existing.quantity += Number(item.quantity || 0);
        existing.total += Number(item.total || 0);

        if (!existing.mrp) {
          existing.mrp = getProductMrp(item);
        }

        if (!existing.productRate) {
          existing.productRate = Number(item.productRate || 0);
        }

        summaryMap.set(key, existing);
      });
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  };

  const generateSummaryPdf = (selectedBills: BillItem[], popup: Window) => {
    const rows = buildSummaryRows(selectedBills);
    const grandTotal = rows.reduce((sum, item) => sum + item.total, 0);
    const generatedAt = formatDate(new Date().toISOString());
    const rowHtml = rows
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatCurrency(item.mrp))}</td>
            <td>${escapeHtml(item.productName)}</td>
            <td>${item.quantity}</td>
            <td>${escapeHtml(formatCurrency(item.productRate))}</td>
            <td>${escapeHtml(formatCurrency(item.total))}</td>
          </tr>
        `,
      )
      .join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Bill Summary</title>
          <style>
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              padding: 24px;
              color: #0f172a;
            }
            h1 {
              margin: 0 0 8px;
              color: #004d40;
            }
            .meta {
              margin-bottom: 8px;
              color: #475569;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background: #ecfdf5;
              color: #004d40;
            }
            tfoot td {
              font-weight: 700;
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <h1>Bill Summary</h1>
          <div class="meta">Generated At: ${escapeHtml(generatedAt)}</div>
          <table>
            <thead>
              <tr>
                <th>MRP</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Product Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">Total of All Products</td>
                <td>${escapeHtml(formatCurrency(grandTotal))}</td>
              </tr>
            </tfoot>
          </table>
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

  const handleGenerateSummary = async () => {
    const selectedBills = data.filter((record, index) =>
      selectedRowKeys.includes(getRecordKey(record, index)),
    );

    if (selectedBills.length === 0) {
      message.warning("Select at least one bill to generate summary");
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");

    if (!popup) {
      message.error("Please allow popups to generate the summary PDF");
      return;
    }

    setSummaryLoading(true);

    try {
      generateSummaryPdf(selectedBills, popup);
      message.success("Summary generated successfully");
    } catch (err: any) {
      popup.close();
      message.error(
        err?.response?.data?.message || err?.message || "Failed to generate summary",
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const columns: ColumnsType<BillItem> = [
    {
      title: "Bill No",
      key: "billNo",
      render: (_, __, index) => (
        <Tag
          style={{
            margin: 0,
            borderRadius: 999,
            padding: "2px 10px",
            border: "1px solid rgba(0, 105, 92, 0.18)",
            background: "rgba(0, 105, 92, 0.08)",
            color: THEME.dark,
            fontWeight: 600,
          }}
        >
          {index + 1}
        </Tag>
      ),
    },
    {
      title: "Bill Date",
      key: "createdAt",
      width: 170,
      render: (_, record) => formatDate(record.createdAt || record.updatedAt),
    },
    {
      title: "Shop Name",
      key: "shopName",
      render: (_, record) => getPartyName(record),
    },
    {
      title: "Amount",
      key: "amount",
      render: (_, record) => (
        <Tag color="green" style={{ borderRadius: 999, margin: 0 }}>
          {formatCurrency(getBillAmount(record))}
        </Tag>
      ),
    },
    {
      title: "Route",
      key: "route",
      render: (_, record) =>
        record.routeId?.routeName
          ? `${record.routeId.routeName}${record.routeId.cityName ? `, ${record.routeId.cityName}` : ""}`
          : "-",
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 220,
      render: (_, record) => record.userId?.name || record.userId?.email || "-",
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const meta = statusMeta(record.status);

        return (
          <Tag
            style={{
              margin: 0,
              borderRadius: 999,
              padding: "2px 10px",
              border: `1px solid ${meta.border}`,
              background: meta.background,
              color: meta.color,
              fontWeight: 600,
              letterSpacing: 0.2,
            }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 112,
      render: (_, record) => {
        const billId = record._id || record.id || "";
        const editDisabled = !canEditBill(record);
        const deleteDisabled = !canDeleteBill(record);
        const tooltipMessage = editDisabled
          ? "Only ordered bills can be edited"
          : "Edit bill";

        return (
          <Space size={4}>
            <Tooltip title={tooltipMessage}>
              <Button
                type="text"
                aria-label="Edit bill"
                onClick={(event) => {
                  event.stopPropagation();
                  openEdit(record);
                }}
                disabled={editDisabled}
                icon={<EditOutlined />}
                style={{
                  color: THEME.mid,
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete bill"
              description="Are you sure you want to delete this bill?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(billId)}
              disabled={deleteDisabled}
            >
              <Tooltip
                title={
                  deleteDisabled
                    ? "Only ordered bills can be deleted"
                    : "Delete bill"
                }
              >
                <Button
                  type="text"
                  aria-label="Delete bill"
                  danger
                  disabled={deleteDisabled}
                  icon={<DeleteOutlined />}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    borderRadius: 10,
                    width: 32,
                    height: 32,
                  }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
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
              Bills
            </Title>
          </div>

          <Space wrap>
            <Input
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search bills..."
              size="large"
              style={{
                width: 280,
                borderRadius: 12,
              }}
            />
            <Popconfirm
              title="Mark selected bills as completed"
              description="Are you sure you want to mark all selected bills as completed?"
              okText="Yes"
              cancelText="No"
              okButtonProps={{ loading: completing }}
              onConfirm={handleCompleteOrders}
              disabled={!selectedRowKeys.length}
            >
              <Button
                onClick={(event) => {
                  if (!selectedRowKeys.length) {
                    event.preventDefault();
                  }
                }}
                loading={completing}
                disabled={!selectedRowKeys.length}
                style={{
                  height: 42,
                  paddingInline: 18,
                  borderRadius: 12,
                  border: "1px solid rgba(0, 105, 92, 0.18)",
                  color: "#fff",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                }}
              >
                Order Complete
              </Button>
            </Popconfirm>
            <Button
              onClick={handleGenerateSummary}
              loading={summaryLoading}
              disabled={!selectedRowKeys.length}
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
              Generate Summary
            </Button>
            <Popconfirm
              title="Delete selected bills"
              description="Are you sure you want to delete all selected bills?"
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true, loading: bulkDeleting }}
              onConfirm={handleBulkDelete}
              disabled={!selectedRowKeys.length}
            >
              <Tooltip title="Delete selected bills">
                <Button
                  danger
                  aria-label="Delete selected bills"
                  icon={<DeleteOutlined />}
                  disabled={!selectedRowKeys.length}
                  loading={bulkDeleting}
                  style={{
                    height: 42,
                    width: 42,
                    minWidth: 42,
                    paddingInline: 0,
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip title="Add bill">
              <Button
                onClick={openCreate}
                aria-label="Add bill"
                icon={<PlusOutlined />}
                style={{
                  height: 42,
                  width: 42,
                  minWidth: 42,
                  paddingInline: 0,
                  borderRadius: 12,
                  border: "none",
                  color: "#fff",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
                  boxShadow: "0 10px 20px rgba(0, 105, 92, 0.18)",
                }}
              />
            </Tooltip>
          </Space>
        </Space>

        {error ? (
          <div style={{ marginTop: 16 }}>
            <Alert type="error" showIcon message={error} />
          </div>
        ) : (
          <Table
            style={{ marginTop: 20 }}
            rowKey={(record, index) => getRecordKey(record, index)}
            loading={loading}
            dataSource={data}
            pagination={false}
            scroll={{ x: "max-content", y: 520 }}
            columns={columns}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              columnWidth: 56,
            }}
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

                setActiveBill(record);
              },
            })}
            rowClassName={() => "bill-row bill-row-clickable"}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Bill" : "New Bill"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Select route, shop and product quantities for this bill
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
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Route"
              name="routeId"
              rules={[{ required: true, message: "Please select route" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                placeholder="Select route"
                onChange={handleRouteChange}
                options={routes.map((route) => ({
                  value: route._id,
                  label: `${route.routeName}${route.cityName ? ` - ${route.cityName}` : ""}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Shop"
              name="shopId"
              rules={[{ required: true, message: "Please select shop" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                placeholder="Select shop"
                disabled={!selectedRouteId}
                options={filteredShops.map((shop) => ({
                  value: shop._id,
                  label: shop.shopName || "Shop",
                }))}
              />
            </Form.Item>
          </div>

          <div style={{ marginTop: 20 }}>
            <Text strong>Products</Text>
          </div>

          <div style={{ marginTop: 12 }}>
            <Table
              rowKey="_id"
              pagination={false}
              scroll={{ y: 320 }}
              dataSource={products}
              columns={[
                {
                  title: "Product",
                  key: "product",
                  width: 360,
                  render: (_, product) => (
                    <Text
                      strong
                      style={{
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      {formatCurrency(product.mrp)} {product.productName}
                    </Text>
                  ),
                },
                {
                  title: "Quantity",
                  key: "quantity",
                  width: 115,
                  render: (_, product, index) => (
                    <Form.Item
                      name={["items", index, "quantity"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        precision={0}
                        size="middle"
                        style={{ width: 88 }}
                        placeholder="Qty"
                      />
                    </Form.Item>
                  ),
                },
                {
                  title: "",
                  key: "multiplySign",
                  width: 48,
                  align: "center",
                  render: () => <Text strong>x</Text>,
                },
                {
                  title: "Rate",
                  key: "rate",
                  width: 110,
                  render: (_, product) => formatCurrency(product.productRate),
                },
                {
                  title: "",
                  key: "equalsSign",
                  width: 48,
                  align: "center",
                  render: () => <Text strong>=</Text>,
                },
                {
                  title: "Total",
                  key: "total",
                  width: 120,
                  render: (_, product, index) => {
                    const quantity = Number(watchedItems?.[index]?.quantity || 0);
                    const lineTotal =
                      Number.isFinite(quantity) && quantity > 0
                        ? quantity * Number(product.productRate || 0)
                        : 0;

                    return <Text strong>{formatCurrency(lineTotal)}</Text>;
                  },
                },
              ]}
            />
          </div>

          <div style={{ display: "none" }}>
            {products.map((product, index) => (
              <Form.Item
                key={product._id}
                name={["items", index, "productId"]}
                initialValue={product._id}
                style={{ marginBottom: 0 }}
              >
                <Input />
              </Form.Item>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Tag
              color="green"
              style={{
                margin: 0,
                borderRadius: 999,
                padding: "8px 14px",
                fontWeight: 700,
              }}
            >
              Total: {formatCurrency(billDraftTotal)}
            </Tag>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(activeBill)}
        onCancel={() => setActiveBill(null)}
        footer={null}
        width={920}
        title="Bill Details"
      >
        {activeBill ? (
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
                  gap: 16,
                  flexWrap: "wrap",
                  borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
                  paddingBottom: 14,
                }}
              >
                <div>
                  <Text type="secondary">Bill No</Text>
                  <div>
                    <Text strong style={{ fontSize: 18 }}>
                      {getBillSequence(data, activeBill)}
                    </Text>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Text type="secondary">Bill Date</Text>
                  <div>
                    <Text strong>{formatDate(activeBill.createdAt || activeBill.updatedAt)}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <Text strong>Shop Name : </Text>
                    <Text>{getPartyName(activeBill)}</Text>
                    <Text style={{ marginLeft: 8 }}>
                      - {activeBill.shopId?.mobileNumber || "-"}
                    </Text>
                  </div>
                  <div>
                    <Text strong>Address : </Text>
                    <Text>{activeBill.shopId?.shopAddress || "-"}</Text>
                  </div>
                  <div>
                    <Text strong>Sales Man : </Text>
                    <Text>{activeBill.userId?.name || activeBill.userId?.email || "-"}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Table
                  rowKey={(record, index) => getProductKey(record, index)}
                  dataSource={activeBill.items || []}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "No bill items found" }}
                  columns={[
                    {
                      title: "Product",
                      key: "productName",
                      render: (_, record) => {
                        const mrp = formatCurrency(getProductMrp(record));
                        return `${mrp} ${record.productName || "-"}`;
                      },
                    },
                    {
                      title: "Quantity",
                      dataIndex: "quantity",
                      key: "quantity",
                      render: (value) => value ?? "-",
                      width: 110,
                    },
                    {
                      title: "",
                      key: "multiplySign",
                      width: 50,
                      align: "center",
                      render: () => <Text strong>x</Text>,
                    },
                    {
                      title: "Rate",
                      key: "productRate",
                      render: (_, record) => formatCurrency(record.productRate),
                      width: 130,
                    },
                    {
                      title: "",
                      key: "equalsSign",
                      width: 50,
                      align: "center",
                      render: () => <Text strong>=</Text>,
                    },
                    {
                      title: "Total",
                      key: "total",
                      render: (_, record) => formatCurrency(record.total),
                      width: 160,
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
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
                  <Text strong>Total Amount : {formatCurrency(getBillAmount(activeBill))}</Text>
                </div>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default BillsPage;
