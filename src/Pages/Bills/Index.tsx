import React, { useEffect, useState } from "react";
import { Alert, Button, Card, Modal, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { getAllAdminBills, markAdminBillsAsShipped } from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;

type BillProductRef = {
  _id?: string;
  mrp?: number;
  productName?: string;
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizeStatus = (status?: string) => status?.trim().toLowerCase() || "unknown";

const statusMeta = (status?: string): StatusStyle => {
  const normalized = normalizeStatus(status);

  if (["paid", "complete", "completed", "settled"].includes(normalized)) {
    return {
      label: "Paid",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [activeBill, setActiveBill] = useState<BillItem | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getAllAdminBills();
      setData(res?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

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

    const billIds = selectedBills
      .map((bill) => bill._id || bill.id)
      .filter((value): value is string => Boolean(value));

    if (billIds.length === 0) {
      message.error("Selected bills are missing ids");
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");

    if (!popup) {
      message.error("Please allow popups to generate the summary PDF");
      return;
    }

    setSummaryLoading(true);

    try {
      await markAdminBillsAsShipped(billIds);
      generateSummaryPdf(selectedBills, popup);
      message.success("Summary generated and selected bills marked as shipped");
      setSelectedRowKeys([]);
      await loadBills();
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
      title: "Party / Shop",
      key: "party",
      render: (_, record) => getPartyName(record),
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
      render: (_, record) => record.userId?.name || record.userId?.email || "-",
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
      title: "Created At",
      key: "createdAt",
      render: (_, record) => formatDate(record.createdAt || record.updatedAt),
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
            <Button
              onClick={handleGenerateSummary}
              loading={summaryLoading}
              disabled={!selectedRowKeys.length}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "1px solid rgba(0, 105, 92, 0.18)",
                color: "#fff",
                fontWeight: 600,
                background: THEME.mid,
              }}
            >
              Generate Summary
            </Button>

            <Button
              onClick={loadBills}
              icon={<ReloadOutlined />}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "1px solid rgba(0, 105, 92, 0.18)",
                color: THEME.dark,
                fontWeight: 600,
                background: "#fff",
              }}
            >
              Refresh
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
            rowKey={(record, index) => getRecordKey(record, index)}
            loading={loading}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            columns={columns}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              columnWidth: 56,
            }}
            onRow={(record) => ({
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (target.closest(".ant-table-selection-column")) {
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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Bill No</Text>
                <div>
                  <Text strong>{getBillSequence(data, activeBill)}</Text>
                </div>
              </Card>
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Party / Shop</Text>
                <div>
                  <Text strong>{getPartyName(activeBill)}</Text>
                </div>
              </Card>
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Route</Text>
                <div>
                  <Text strong>
                    {activeBill.routeId?.routeName || "-"}
                    {activeBill.routeId?.cityName ? `, ${activeBill.routeId.cityName}` : ""}
                  </Text>
                </div>
              </Card>
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Created By</Text>
                <div>
                  <Text strong>{activeBill.userId?.name || activeBill.userId?.email || "-"}</Text>
                </div>
              </Card>
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Status</Text>
                <div>
                  <Tag
                    style={{
                      marginTop: 4,
                      borderRadius: 999,
                      padding: "2px 10px",
                      border: `1px solid ${statusMeta(activeBill.status).border}`,
                      background: statusMeta(activeBill.status).background,
                      color: statusMeta(activeBill.status).color,
                      fontWeight: 600,
                    }}
                  >
                    {statusMeta(activeBill.status).label}
                  </Tag>
                </div>
              </Card>
              <Card size="small" bordered={false} style={{ background: "#f7fffd" }}>
                <Text type="secondary">Created At</Text>
                <div>
                  <Text strong>{formatDate(activeBill.createdAt || activeBill.updatedAt)}</Text>
                </div>
              </Card>
            </div>

            <Card
              size="small"
              bordered={false}
              style={{ background: "#fcfffe", border: "1px solid rgba(0, 105, 92, 0.08)" }}
            >
              <Space direction="vertical" size={4}>
                <Text type="secondary">Shop Address</Text>
                <Text>{activeBill.shopId?.shopAddress || "-"}</Text>
                <Text type="secondary">Mobile</Text>
                <Text>{activeBill.shopId?.mobileNumber || "-"}</Text>
              </Space>
            </Card>

            <Table
              rowKey={(record, index) => getProductKey(record, index)}
              dataSource={activeBill.items || []}
              columns={itemColumns}
              pagination={false}
              locale={{ emptyText: "No bill items found" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Tag
                color="green"
                style={{
                  margin: 0,
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontWeight: 700,
                }}
              >
                Grand Total: {formatCurrency(getBillAmount(activeBill))}
              </Tag>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default BillsPage;
