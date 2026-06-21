import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Alert, Card, Col, DatePicker, Empty, Row, Select, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FiBox, FiMapPin, FiShoppingBag, FiUsers } from "react-icons/fi";
import {
  getAdminDashboardSummary,
  getAllAdminBills,
  getAllDealers,
  getAllDealerBills,
} from "../Utils/Api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SURFACE = {
  page:
    "radial-gradient(circle at top left, rgba(13, 148, 136, 0.14) 0%, rgba(13, 148, 136, 0) 32%), radial-gradient(circle at top right, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 28%), linear-gradient(180deg, #f4fbfa 0%, #eef5fb 48%, #f8fafc 100%)",
  panel: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  shadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
};

const TOP_CARD_STYLES = [
  {
    background:
      "linear-gradient(135deg, rgba(15, 118, 110, 0.95) 0%, rgba(34, 211, 193, 0.78) 100%)",
    glow: "rgba(45, 212, 191, 0.38)",
  },
  {
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.96) 0%, rgba(56, 189, 248, 0.74) 100%)",
    glow: "rgba(59, 130, 246, 0.34)",
  },
  {
    background:
      "linear-gradient(135deg, rgba(8, 145, 178, 0.96) 0%, rgba(45, 212, 191, 0.72) 100%)",
    glow: "rgba(34, 211, 238, 0.32)",
  },
  {
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.96) 0%, rgba(99, 102, 241, 0.78) 55%, rgba(139, 92, 246, 0.74) 100%)",
    glow: "rgba(129, 140, 248, 0.34)",
  },
] as const;

type DashboardSummary = {
  routesCount: number;
  shopsCount: number;
  productsCount: number;
  dealersCount?: number;
  completedBillsCount?: number;
  completeBillsCount?: number;
  availableYears?: number[];
};

type RetailerBillItem = {
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
};

type DealerBillItem = {
  _id?: string;
  billDate?: string;
  createdAt?: string;
  updatedAt?: string;
  totalAmount?: number;
  dealerId?: {
    _id?: string;
    dealerName?: string;
    city?: string;
    contactNo?: string;
  };
};

type RankingRow = {
  key: string;
  rank: number;
  name: string;
  city: string;
  count: number;
  amount: number;
};

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

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

const now = dayjs();
const defaultSummary: DashboardSummary = {
  routesCount: 0,
  shopsCount: 0,
  productsCount: 0,
  completedBillsCount: 0,
  availableYears: [now.year()],
};

const normalizeStatus = (status?: string) => status?.trim().toLowerCase() || "unknown";

const isCompletedStatus = (status?: string) =>
  ["complete", "completed", "order complete", "order completed", "settled"].includes(
    normalizeStatus(status),
  );

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatRoundedCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

const formatCompactCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const getRetailerAmount = (record: RetailerBillItem) =>
  Number(
    record.amount ??
      record.billAmount ??
      record.totalAmount ??
      record.grandTotal ??
      record.netAmount ??
      0,
  );

const getDealerAmount = (record: DealerBillItem) => Number(record.totalAmount ?? 0);

const toDate = (value?: string) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const isWithinFilter = (
  value: Dayjs | null,
  selectedMonth: number,
  selectedYear: number,
  selectedDateRange: DateRangeValue,
) => {
  if (!value) return false;

  if (selectedDateRange?.[0] && selectedDateRange?.[1]) {
    return (
      (value.isAfter(selectedDateRange[0], "day") || value.isSame(selectedDateRange[0], "day")) &&
      (value.isBefore(selectedDateRange[1], "day") || value.isSame(selectedDateRange[1], "day"))
    );
  }

  return value.month() + 1 === selectedMonth && value.year() === selectedYear;
};

const buildRanking = <T,>(
  records: T[],
  getKey: (record: T) => string | undefined,
  getName: (record: T) => string,
  getCity: (record: T) => string,
  getAmount: (record: T) => number,
) => {
  const rankingMap = new Map<string, Omit<RankingRow, "rank">>();

  records.forEach((record) => {
    const key = getKey(record);
    if (!key) return;

    const current = rankingMap.get(key) || {
      key,
      name: getName(record),
      city: getCity(record),
      count: 0,
      amount: 0,
    };

    current.count += 1;
    current.amount += getAmount(record);
    if (!current.name || current.name === "-") {
      current.name = getName(record);
    }
    if (!current.city || current.city === "-") {
      current.city = getCity(record);
    }

    rankingMap.set(key, current);
  });

  return Array.from(rankingMap.values())
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return b.count - a.count;
    })
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
};

const getLeadingEntry = (rows: RankingRow[]) => rows[0]?.name || "No leader yet";

type RankingSectionHeaderProps = {
  selectedMonth: number;
  selectedYear: number;
  selectedDateRange: DateRangeValue;
  monthOptions: Array<{ value: number; label: string }>;
  yearOptions: Array<{ value: number; label: string }>;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
  onDateRangeChange: (value: DateRangeValue) => void;
};

type RankingPanelProps = {
  title: string;
  subtitle: string;
  countLabel: string;
  countValue: number;
  amountValue: number;
  amountTone: string;
  countTone: string;
  data: RankingRow[];
  columns: ColumnsType<RankingRow>;
  emptyText: string;
  borderColor: string;
  background: string;
};

const RankingSectionHeader: React.FC<RankingSectionHeaderProps> = ({
  selectedMonth,
  selectedYear,
  selectedDateRange,
  monthOptions,
  yearOptions,
  onMonthChange,
  onYearChange,
  onDateRangeChange,
}) => (
  <Card
    bordered={false}
    style={{
      borderRadius: 18,
      border: "1px solid rgba(148, 163, 184, 0.12)",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.96) 45%, rgba(236,253,245,0.96) 100%)",
      overflow: "hidden",
    }}
    bodyStyle={{ padding: 14 }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 30%), radial-gradient(circle at bottom left, rgba(20, 184, 166, 0.12) 0%, rgba(20, 184, 166, 0) 28%)",
        pointerEvents: "none",
      }}
    />
    <Row
      gutter={[12, 12]}
      style={{
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
      align="middle"
    >
      <Col xs={24} xl={7}>
        <div style={{ display: "grid", gap: 4 }}>
          <Text
            style={{
              color: "#0f766e",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            Performance Filters
          </Text>
          <Title level={5} style={{ margin: 0, color: "#0f172a", fontSize: 20 }}>
            Top 10 Rankings
          </Title>
          <Text style={{ color: "#475569", fontSize: 12 }}>
            Switch the period to compare leaderboards by value and order activity.
          </Text>
        </div>
      </Col>
      <Col xs={24} xl={17}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          <Select
            size="small"
            value={selectedMonth}
            onChange={onMonthChange}
            options={monthOptions}
          />
          <Select
            size="small"
            value={selectedYear}
            onChange={onYearChange}
            options={yearOptions}
          />
          <RangePicker
            size="small"
            value={selectedDateRange}
            onChange={(value) => onDateRangeChange(value)}
            format="DD-MM-YYYY"
            allowClear
            style={{ width: "100%" }}
          />
        </div>
      </Col>
    </Row>
  </Card>
);

const RankingPanel: React.FC<RankingPanelProps> = ({
  title,
  subtitle,
  countLabel,
  countValue,
  amountValue,
  amountTone,
  countTone,
  data,
  columns,
  emptyText,
  borderColor,
  background,
}) => (
  <Card
    bordered={false}
    style={{
      borderRadius: 18,
      border: borderColor,
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      background,
      overflow: "hidden",
    }}
    bodyStyle={{ padding: 0 }}
  >
    <div
      style={{
        padding: 14,
        borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
        background:
          countTone === "green"
            ? "linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(240,249,255,0.95) 100%)"
            : "linear-gradient(135deg, rgba(239,246,255,0.96) 0%, rgba(250,245,255,0.96) 100%)",
      }}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col flex="auto">
          <div style={{ display: "grid", gap: 4 }}>
            <Title level={5} style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>
              {title}
            </Title>
            <Text style={{ color: "#64748b", fontSize: 12 }}>{subtitle}</Text>
          </div>
        </Col>
        <Col>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(96px, auto))",
              gap: 8,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                minWidth: 102,
              }}
            >
              <Text style={{ fontSize: 10, color: "#64748b" }}>Volume</Text>
              <div style={{ marginTop: 2, fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                {countValue}
              </div>
              <Text style={{ fontSize: 10, color: "#64748b" }}>{countLabel}</Text>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                minWidth: 102,
              }}
            >
              <Text style={{ fontSize: 10, color: "#64748b" }}>Amount</Text>
              <div style={{ marginTop: 2, fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                {formatRoundedCurrency(amountValue)}
              </div>
              <Tag color={amountTone} style={{ margin: "4px 0 0", borderRadius: 999, fontSize: 10 }}>
                live total
              </Tag>
            </div>
          </div>
        </Col>
      </Row>
    </div>

    <div style={{ padding: 10 }}>
      <Table
        rowKey="key"
        dataSource={data}
        columns={columns}
        pagination={false}
        size="middle"
        rowClassName={() => "dashboard-ranking-row"}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />,
        }}
        style={{ overflow: "hidden" }}
      />
    </div>
  </Card>
);

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [retailerBills, setRetailerBills] = useState<RetailerBillItem[]>([]);
  const [dealerBills, setDealerBills] = useState<DealerBillItem[]>([]);
  const [allDealersCount, setAllDealersCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState(now.year());
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeValue>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      const fromDate =
        selectedDateRange?.[0] && selectedDateRange?.[1]
          ? selectedDateRange[0].format("YYYY-MM-DD")
          : undefined;
      const toDate =
        selectedDateRange?.[0] && selectedDateRange?.[1]
          ? selectedDateRange[1].format("YYYY-MM-DD")
          : undefined;

      try {
        const [summaryRes, retailerRes, dealerRes, dealersRes] = await Promise.all([
          getAdminDashboardSummary({
            month: selectedMonth,
            year: selectedYear,
            fromDate,
            toDate,
          }),
          getAllAdminBills({
            month: selectedMonth,
            year: selectedYear,
            fromDate,
            toDate,
          }),
          getAllDealerBills({
            month: selectedMonth,
            year: selectedYear,
            fromDate,
            toDate,
          }),
          getAllDealers(),
        ]);

        setSummary({
          ...defaultSummary,
          ...(summaryRes?.data || {}),
        });
        setRetailerBills(Array.isArray(retailerRes?.data) ? retailerRes.data : []);
        setDealerBills(Array.isArray(dealerRes?.data) ? dealerRes.data : []);
        setAllDealersCount(Array.isArray(dealersRes?.data) ? dealersRes.data.length : 0);
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

    void loadDashboard();
  }, [selectedDateRange, selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    const yearSet = new Set<number>(summary.availableYears?.length ? summary.availableYears : []);
    yearSet.add(selectedYear);

    retailerBills.forEach((bill) => {
      const parsed = toDate(bill.createdAt || bill.updatedAt);
      if (parsed) {
        yearSet.add(parsed.year());
      }
    });

    dealerBills.forEach((bill) => {
      const parsed = toDate(bill.billDate || bill.createdAt || bill.updatedAt);
      if (parsed) {
        yearSet.add(parsed.year());
      }
    });

    return Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((year) => ({
        value: year,
        label: String(year),
      }));
  }, [dealerBills, retailerBills, selectedYear, summary.availableYears]);

  const filteredRetailerBills = useMemo(
    () =>
      retailerBills.filter((bill) => {
        if (!isCompletedStatus(bill.status)) return false;
        return isWithinFilter(
          toDate(bill.createdAt || bill.updatedAt),
          selectedMonth,
          selectedYear,
          selectedDateRange,
        );
      }),
    [retailerBills, selectedDateRange, selectedMonth, selectedYear],
  );

  const filteredDealerBills = useMemo(
    () =>
      dealerBills.filter((bill) =>
        isWithinFilter(
          toDate(bill.billDate || bill.createdAt || bill.updatedAt),
          selectedMonth,
          selectedYear,
          selectedDateRange,
        ),
      ),
    [dealerBills, selectedDateRange, selectedMonth, selectedYear],
  );

  const completedOrderCount = filteredRetailerBills.length;
  const completedOrderAmount = filteredRetailerBills.reduce(
    (sum, bill) => sum + getRetailerAmount(bill),
    0,
  );
  const totalDealersCount = Number(summary.dealersCount ?? allDealersCount ?? 0);
  const dealerBillCount = filteredDealerBills.length;
  const dealerBillAmount = filteredDealerBills.reduce((sum, bill) => sum + getDealerAmount(bill), 0);

  const topRetailers = useMemo(
    () =>
      buildRanking(
        filteredRetailerBills,
        (bill) => bill.shopId?._id,
        (bill) => bill.shopId?.shopName || "Unknown Retailer",
        (bill) => bill.routeId?.cityName || bill.shopId?.shopAddress || "-",
        getRetailerAmount,
      ),
    [filteredRetailerBills],
  );

  const topDealers = useMemo(
    () =>
      buildRanking(
        filteredDealerBills,
        (bill) => bill.dealerId?._id,
        (bill) => bill.dealerId?.dealerName || "Unknown Dealer",
        (bill) => bill.dealerId?.city || "-",
        getDealerAmount,
      ),
    [filteredDealerBills],
  );

  const rankingColumns = (entityLabel: string, countLabel: string): ColumnsType<RankingRow> => [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (value: number) => (
        <Tag
          color={value <= 3 ? "gold" : "default"}
          style={{
            margin: 0,
            borderRadius: 999,
            minWidth: 44,
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          #{value}
        </Tag>
      ),
    },
    {
      title: entityLabel,
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{record.name}</div>
          <Text style={{ color: "#64748b", fontSize: 12 }}>{record.city}</Text>
        </div>
      ),
    },
    {
      title: countLabel,
      dataIndex: "count",
      key: "count",
      width: 130,
      align: "center",
      render: (value: number) => (
        <Tag
          color="blue"
          style={{ margin: 0, borderRadius: 999, minWidth: 40, textAlign: "center" }}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      align: "right",
      render: (value: number) => (
        <Text strong style={{ fontSize: 15, color: "#0f172a" }}>
          {formatRoundedCurrency(value)}
        </Text>
      ),
    },
  ];

  const cards = [
    {
      label: "All Routes",
      value: summary.routesCount,
      color: "#0f766e",
      helper: "Registered routes",
      accent: "rgba(16, 185, 129, 0.18)",
      background: "linear-gradient(135deg, rgba(236, 253, 245, 0.88) 0%, rgba(209, 250, 229, 0.72) 100%)",
      icon: FiMapPin,
    },
    {
      label: "All Shops",
      value: summary.shopsCount,
      color: "#1d4ed8",
      helper: "Active retailers",
      accent: "rgba(59, 130, 246, 0.18)",
      background: "linear-gradient(135deg, rgba(239, 246, 255, 0.88) 0%, rgba(219, 234, 254, 0.72) 100%)",
      icon: FiShoppingBag,
    },
    {
      label: "All Products",
      value: summary.productsCount,
      color: "#b45309",
      helper: "Available products",
      accent: "rgba(245, 158, 11, 0.18)",
      background: "linear-gradient(135deg, rgba(255, 251, 235, 0.9) 0%, rgba(253, 230, 138, 0.72) 100%)",
      icon: FiBox,
    },
    {
      label: "All Dealers",
      value: totalDealersCount,
      color: "#7c2d12",
      helper: "Registered dealers",
      accent: "rgba(249, 115, 22, 0.18)",
      background: "linear-gradient(135deg, rgba(255, 247, 237, 0.9) 0%, rgba(254, 215, 170, 0.72) 100%)",
      icon: FiUsers,
    },
  ];

  const selectedPeriodLabel =
    selectedDateRange?.[0] && selectedDateRange?.[1]
      ? `${selectedDateRange[0].format("DD MMM YYYY")} - ${selectedDateRange[1].format("DD MMM YYYY")}`
      : `${monthOptions.find((option) => option.value === selectedMonth)?.label || "Month"} ${selectedYear}`;

  return (
    <div
      style={{
        height: "calc(100vh - 50px)",
        overflowY: "auto",
        padding: 16,
        background: SURFACE.page,
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          boxShadow: SURFACE.shadow,
          background: SURFACE.panel,
        }}
        bodyStyle={{ padding: 18 }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              padding: 18,
              background:
                "linear-gradient(135deg, rgba(6, 95, 70, 0.98) 0%, rgba(13, 148, 136, 0.92) 52%, rgba(30, 64, 175, 0.88) 100%)",
              boxShadow: "0 22px 40px rgba(15, 23, 42, 0.14)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -80,
                right: -30,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -60,
                left: -20,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <Row gutter={[14, 14]} align="stretch">
              <Col xs={24} xl={11}>
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    minHeight: 250,
                    borderRadius: 24,
                    padding: 24,
                    border: "1px solid rgba(255,255,255,0.34)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.28), 0 16px 34px rgba(15, 23, 42, 0.12)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -120,
                      right: -20,
                      width: 220,
                      height: 220,
                      borderRadius: "50%",
                      background: "rgba(45, 212, 191, 0.12)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -90,
                      left: -50,
                      width: 260,
                      height: 150,
                      borderRadius: "50%",
                      border: "1px solid rgba(125, 211, 252, 0.22)",
                    }}
                  />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      fontSize: 11,
                      fontWeight: 700,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Dashboard Overview
                  </Text>
                  <Title
                    level={2}
                    style={{
                      margin: "12px 0 10px",
                      color: "#ffffff",
                      fontSize: 38,
                      lineHeight: 1.05,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Admin Dashboard
                  </Title>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.82)",
                      fontSize: 14,
                      maxWidth: 390,
                      lineHeight: 1.6,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Track dealer billing performance, retailer completion value, and business coverage
                    in one clean view.
                  </Text>
                </div>
              </Col>
              <Col xs={24} xl={13}>
                <Row gutter={[12, 12]}>
                  {cards.map((card, index) => {
                    const visual = TOP_CARD_STYLES[index];
                    const CardIcon = card.icon;

                    return (
                    <Col key={card.label} xs={12}>
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          minHeight: 118,
                          borderRadius: 24,
                          padding: 16,
                          background: visual.background,
                          border: "1px solid rgba(255,255,255,0.28)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.2), 0 14px 30px rgba(15, 23, 42, 0.14)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: -8,
                            left: 18,
                            width: 76,
                            height: 2,
                            background: "rgba(255,255,255,0.88)",
                            boxShadow: `0 0 14px ${visual.glow}`,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: 16,
                            bottom: 14,
                            color: "rgba(255,255,255,0.18)",
                            opacity: 0.9,
                          }}
                        >
                          {React.createElement(CardIcon as any, { size: 42, strokeWidth: 1.75 })}
                        </div>
                        <Text
                          style={{
                            position: "relative",
                            zIndex: 1,
                            color: "#ffffff",
                            fontWeight: 700,
                            display: "block",
                            marginTop: 2,
                            fontSize: 13,
                          }}
                        >
                          {card.label}
                        </Text>
                        <div
                          style={{
                            position: "relative",
                            zIndex: 1,
                            fontSize: 28,
                            lineHeight: 1,
                            fontWeight: 900,
                            marginTop: 5,
                            color: "#ffffff",
                            textShadow: "0 6px 18px rgba(15, 23, 42, 0.18)",
                          }}
                        >
                          {card.value}
                        </div>
                        <Text
                          style={{
                            position: "relative",
                            zIndex: 1,
                            color: "rgba(255,255,255,0.86)",
                            fontSize: 11,
                            marginTop: 6,
                          }}
                        >
                          {card.helper}
                        </Text>
                      </div>
                    </Col>
                  )})}
                </Row>
              </Col>
            </Row>
          </div>

          {loading ? (
            <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
              <Spin size="large" />
            </div>
          ) : error ? (
            <Alert type="error" showIcon message={error} />
          ) : (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <RankingSectionHeader
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                selectedDateRange={selectedDateRange}
                monthOptions={monthOptions}
                yearOptions={yearOptions}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onDateRangeChange={setSelectedDateRange}
              />

              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <RankingPanel
                    title="Top 10 Dealers"
                    subtitle="Ranked by total bill amount in the selected period."
                    countLabel="dealer bills"
                    countValue={dealerBillCount}
                    amountValue={dealerBillAmount}
                    amountTone="cyan"
                    countTone="green"
                    data={topDealers}
                    columns={rankingColumns("Dealer", "Bills")}
                    emptyText="No dealer bills found for this filter"
                    borderColor="1px solid rgba(0, 105, 92, 0.08)"
                    background="linear-gradient(180deg, #ffffff 0%, #f9fffd 100%)"
                  />
                </Col>

                <Col xs={24} xl={12}>
                  <RankingPanel
                    title="Top 10 Retailers"
                    subtitle="Ranked by completed order amount."
                    countLabel="completed orders"
                    countValue={completedOrderCount}
                    amountValue={completedOrderAmount}
                    amountTone="purple"
                    countTone="blue"
                    data={topRetailers}
                    columns={rankingColumns("Retailer", "Orders")}
                    emptyText="No completed retailer orders found for this filter"
                    borderColor="1px solid rgba(29, 78, 216, 0.08)"
                    background="linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
                  />
                </Col>
              </Row>
            </Space>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Dashboard;
