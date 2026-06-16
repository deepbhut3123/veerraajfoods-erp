import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Typography } from "antd";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminDashboardSummary, getAllAdminBills } from "../Utils/Api";

const { Title, Text } = Typography;

type ShippedUserSummary = {
  _id: string;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  shippedBillsCount: number;
};

type ShippedAmountPoint = {
  date?: string;
  label?: string;
  amount?: number;
  totalAmount?: number;
  price?: number;
  value?: number;
  userId?: string;
  userName?: string;
  name?: string;
};

type DashboardSummary = {
  routesCount: number;
  shopsCount: number;
  productsCount: number;
  shippedBillsCount: number;
  selectedMonth: number;
  selectedYear: number;
  availableYears: number[];
  monthlyShippedByUser: ShippedUserSummary[];
  totalShippedAmount?: number;
  shippedBillsAmount?: number;
  shippedAmountTotal?: number;
  shippedAmountByDate?: ShippedAmountPoint[];
  shippedBillsTrend?: ShippedAmountPoint[];
  dailyShippedAmount?: ShippedAmountPoint[];
};

type BillItem = {
  _id?: string;
  id?: string;
  amount?: number;
  billAmount?: number;
  totalAmount?: number;
  grandTotal?: number;
  netAmount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  };
};

type ChartPoint = {
  key: string;
  rawDate: string;
  dateLabel: string;
  amount: number;
};

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentDate = new Date();

const emptySummary: DashboardSummary = {
  routesCount: 0,
  shopsCount: 0,
  productsCount: 0,
  shippedBillsCount: 0,
  selectedMonth: currentDate.getMonth() + 1,
  selectedYear: currentDate.getFullYear(),
  availableYears: [currentDate.getFullYear()],
  monthlyShippedByUser: [],
  shippedAmountByDate: [],
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatCompactCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatChartDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const normalizeStatus = (status?: string) => status?.trim().toLowerCase() || "unknown";

const isShippedStatus = (status?: string) => normalizeStatus(status) === "shipped";

const getBillAmount = (record: BillItem) =>
  Number(
    record.amount ??
      record.billAmount ??
      record.totalAmount ??
      record.grandTotal ??
      record.netAmount ??
      0,
  );

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [allBills, setAllBills] = useState<BillItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(emptySummary.selectedMonth);
  const [selectedYear, setSelectedYear] = useState(emptySummary.selectedYear);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryRes, billsRes] = await Promise.all([
          getAdminDashboardSummary({
            month: selectedMonth,
            year: selectedYear,
            userId: selectedUserId,
          }),
          getAllAdminBills(),
        ]);

        const nextSummary = summaryRes?.data || emptySummary;
        const nextBills = billsRes?.data || [];

        setSummary({
          ...emptySummary,
          ...nextSummary,
        });
        setAllBills(Array.isArray(nextBills) ? nextBills : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load admin dashboard summary",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [selectedMonth, selectedYear, selectedUserId]);

  const yearOptions = useMemo(() => {
    const yearSet = new Set<number>(
      summary.availableYears?.length ? summary.availableYears : [selectedYear],
    );

    allBills.forEach((bill) => {
      const value = bill.createdAt || bill.updatedAt;
      if (!value) return;

      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        yearSet.add(date.getFullYear());
      }
    });

    return Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((year) => ({
        value: year,
        label: String(year),
      }));
  }, [allBills, selectedYear, summary.availableYears]);

  const fallbackFilteredBills = useMemo(() => {
    return allBills.filter((bill) => {
      if (!isShippedStatus(bill.status)) {
        return false;
      }

      if (selectedUserId && bill.userId?._id !== selectedUserId) {
        return false;
      }

      const rawDate = bill.createdAt || bill.updatedAt;
      if (!rawDate) {
        return false;
      }

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [allBills, selectedMonth, selectedUserId, selectedYear]);

  const userOptions = useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string }>();

    summary.monthlyShippedByUser.forEach((user) => {
      if (user?._id) {
        optionMap.set(user._id, {
          value: user._id,
          label: user.name || user.email || "Unknown User",
        });
      }
    });

    const series =
      summary.shippedAmountByDate || summary.shippedBillsTrend || summary.dailyShippedAmount || [];

    series.forEach((point) => {
      if (point?.userId) {
        optionMap.set(point.userId, {
          value: point.userId,
          label: point.userName || point.name || "Unknown User",
        });
      }
    });

    fallbackFilteredBills.forEach((bill) => {
      const userId = bill.userId?._id;
      if (userId) {
        optionMap.set(userId, {
          value: userId,
          label: bill.userId?.name || bill.userId?.email || "Unknown User",
        });
      }
    });

    return [{ value: "all", label: "All Users" }, ...Array.from(optionMap.values())];
  }, [fallbackFilteredBills, summary]);

  const summarySeries = useMemo(() => {
    const rawSeries =
      summary.shippedAmountByDate || summary.shippedBillsTrend || summary.dailyShippedAmount || [];

    return rawSeries
      .filter((point) => {
        if (!selectedUserId) return true;
        return point.userId === selectedUserId;
      })
      .map((point, index) => {
        const amount = Number(
          point.amount ?? point.totalAmount ?? point.price ?? point.value ?? 0,
        );
        const rawDate = point.date || point.label || `Point ${index + 1}`;

        return {
          key: `${rawDate}-${index}`,
          rawDate,
          dateLabel: formatChartDate(rawDate),
          amount,
        };
      })
      .filter((point) => point.amount > 0);
  }, [selectedUserId, summary]);

  const fallbackChartData = useMemo<ChartPoint[]>(() => {
    return fallbackFilteredBills
      .map((bill, index) => {
        const rawDate = bill.createdAt || bill.updatedAt || `Point ${index + 1}`;

        return {
          key: bill._id || bill.id || `${rawDate}-${index}`,
          rawDate,
          dateLabel: formatChartDate(rawDate),
          amount: getBillAmount(bill),
        };
      })
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [fallbackFilteredBills]);

  const chartData = summarySeries.length ? summarySeries : fallbackChartData;

  const shippedAmountTotal = useMemo(() => {
    if (!summarySeries.length && fallbackChartData.length) {
      return fallbackChartData.reduce((total, item) => total + item.amount, 0);
    }

    const summaryAmount =
      summary.totalShippedAmount ??
      summary.shippedBillsAmount ??
      summary.shippedAmountTotal;

    if (typeof summaryAmount === "number") {
      return summaryAmount;
    }

    if (summarySeries.length) {
      return summarySeries.reduce((total, item) => total + item.amount, 0);
    }

    return 0;
  }, [fallbackChartData, summary, summarySeries]);

  const shippedBillsCount = useMemo(() => {
    if (!summarySeries.length && fallbackFilteredBills.length) {
      return fallbackFilteredBills.length;
    }

    return Number(summary.shippedBillsCount || 0);
  }, [fallbackFilteredBills.length, summary.shippedBillsCount, summarySeries.length]);

  const cards = [
    {
      label: "All Routes",
      value: summary.routesCount,
      color: "#0f766e",
      background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
      helper: "Registered routes",
    },
    {
      label: "All Shops",
      value: summary.shopsCount,
      color: "#1d4ed8",
      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      helper: "Active shops",
    },
    {
      label: "All Products",
      value: summary.productsCount,
      color: "#b45309",
      background: "linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)",
      helper: "Available products",
    },
    {
      label: "Shipped Bill Total",
      value: formatCompactCurrency(shippedAmountTotal),
      color: "#6d28d9",
      background: "linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)",
      helper: `${shippedBillsCount} shipped bills`,
    },
  ];

  return (
    <div
      style={{
        height: "calc(100vh - 50px)",
        overflowY: "auto",
        padding: 20,
        background:
          "linear-gradient(180deg, #f6fbfb 0%, #eef6f5 45%, #f8fafc 100%)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            Admin Dashboard
          </Title>
        </div>

        {loading ? (
          <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} />
        ) : (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              {cards.map((card) => (
                <Col key={card.label} xs={24} sm={12} xl={6}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: card.background,
                      minHeight: 160,
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <Text style={{ color: card.color, fontWeight: 600 }}>
                      {card.label}
                    </Text>
                    <div
                      style={{
                        fontSize: card.label === "Shipped Bill Total" ? 36 : 44,
                        lineHeight: 1.1,
                        fontWeight: 800,
                        marginTop: 12,
                        color: "#0f172a",
                      }}
                    >
                      {card.value}
                    </div>
                    <Text style={{ color: "#5b6472", fontSize: 13 }}>{card.helper}</Text>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(0, 105, 92, 0.08)",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <Space direction="vertical" size={18} style={{ width: "100%" }}>
                <Space
                  align="start"
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                      Shipped Bill Price Graph
                    </Title>
                    <Text style={{ color: "#64748b" }}>
                      X-axis shows date and Y-axis shows amount
                    </Text>
                  </div>

                  <Space wrap>
                    <Select
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                      options={monthOptions}
                      style={{ minWidth: 150 }}
                    />
                    <Select
                      value={selectedYear}
                      onChange={setSelectedYear}
                      options={yearOptions}
                      style={{ minWidth: 120 }}
                    />
                    <Select
                      value={selectedUserId || "all"}
                      onChange={(value) => setSelectedUserId(value === "all" ? undefined : value)}
                      options={userOptions}
                      style={{ minWidth: 180 }}
                    />
                  </Space>
                </Space>

                <div
                  style={{
                    height: 340,
                    borderRadius: 16,
                    background:
                      "linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    padding: 16,
                  }}
                >
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ea" />
                        <XAxis dataKey="dateLabel" tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          tickFormatter={(value) => formatCompactCurrency(Number(value))}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                          labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#7c3aed"
                          strokeWidth={3}
                          dot={{ r: 6, strokeWidth: 2, fill: "#ffffff" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                      <Empty
                        description="No shipped bill found for the selected month, year, and user"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )}
                </div>
              </Space>
            </Card>
          </Space>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
