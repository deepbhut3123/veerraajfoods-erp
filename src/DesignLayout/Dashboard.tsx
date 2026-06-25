import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Tag, Typography } from "antd";
import { FiBox, FiMapPin, FiShoppingBag, FiUsers } from "react-icons/fi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminDashboardSummary,
  getAllAdminBills,
  getAllDealers,
  getAllDealerBills,
} from "../Utils/Api";

const { Title, Text } = Typography;
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

const PIE_COLORS = [
  "#0f766e",
  "#0ea5e9",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#dc2626",
  "#0891b2",
  "#16a34a",
  "#9333ea",
  "#ca8a04",
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

const monthShortLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

const formatRoundedCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

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
) => {
  if (!value) return false;

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

type RankingPanelProps = {
  title: string;
  subtitle: string;
  amountValue: number;
  amountTone: string;
  countTone: string;
  data: RankingRow[];
  emptyText: string;
  borderColor: string;
  background: string;
  selectedMonth: number;
  selectedYear: number;
  yearOptions: Array<{ value: number; label: string }>;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
};

type RankingPieTooltipProps = {
  index: number;
  rank: number;
  name: string;
  amount: number;
};

type RevenueMonthRow = {
  month: string;
  totalRevenue: number;
  dealerRevenue: number;
  retailerRevenue: number;
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const createDonutSegmentPath = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

const RankingPanel: React.FC<RankingPanelProps> = ({
  title,
  subtitle,
  amountValue,
  amountTone,
  countTone,
  data,
  emptyText,
  borderColor,
  background,
  selectedMonth,
  selectedYear,
  yearOptions,
  onMonthChange,
  onYearChange,
}) => {
  const chartData = data.map((item) => ({
    index: item.rank - 1,
    rank: item.rank,
    name: item.name,
    amount: item.amount,
  }));
  const [hoveredSlice, setHoveredSlice] = useState<RankingPieTooltipProps | null>(null);
  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
  const cx = 170;
  const cy = 170;
  const innerRadius = 72;
  const outerRadius = 132;
  const startAngle = -90;

  let runningAngle = startAngle;
  const donutSegments = chartData.map((item) => {
    const sweep = totalAmount > 0 ? (item.amount / totalAmount) * 360 : 0;
    const segmentStart = runningAngle;
    const segmentEnd = runningAngle + sweep;
    const midAngle = segmentStart + sweep / 2;
    const labelPoint = polarToCartesian(cx, cy, (innerRadius + outerRadius) / 2, midAngle);
    const outerLabelPoint = polarToCartesian(cx, cy, outerRadius + 12, midAngle);
    const calloutEndX = outerLabelPoint.x + (outerLabelPoint.x >= cx ? 18 : -18);
    const path = createDonutSegmentPath(cx, cy, innerRadius, outerRadius, segmentStart, segmentEnd);

    runningAngle = segmentEnd;

    return {
      ...item,
      sweep,
      path,
      midAngle,
      labelPoint,
      outerLabelPoint,
      calloutEndX,
    };
  });

  const distributeCalloutLabels = <T extends {
    sweep: number;
    outerLabelPoint: { x: number; y: number };
    calloutEndX: number;
  }>(segments: T[], isRightSide: boolean) => {
    const minimumGap = 18;
    const minY = 26;
    const maxY = 314;
    const smallSegments = segments
      .filter((segment) => segment.sweep > 0 && segment.sweep < 22)
      .sort((left, right) => left.outerLabelPoint.y - right.outerLabelPoint.y);

    let previousY = minY - minimumGap;

    return smallSegments.map((segment) => {
      const adjustedY = Math.max(
        minY,
        Math.min(maxY, Math.max(segment.outerLabelPoint.y, previousY + minimumGap)),
      );

      previousY = adjustedY;

      return {
        ...segment,
        calloutLabelY: adjustedY,
        calloutBendX: segment.outerLabelPoint.x + (isRightSide ? 10 : -10),
      };
    });
  };

  const leftCallouts = distributeCalloutLabels(
    donutSegments.filter((segment) => segment.outerLabelPoint.x < cx),
    false,
  );
  const rightCallouts = distributeCalloutLabels(
    donutSegments.filter((segment) => segment.outerLabelPoint.x >= cx),
    true,
  );
  const adjustedCalloutMap = new Map(
    [...leftCallouts, ...rightCallouts].map((segment) => [segment.rank, segment]),
  );

  return (
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <Title level={5} style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>
                  {title}
                </Title>
                <Text style={{ color: "#64748b", fontSize: 12 }}>{subtitle}</Text>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 14,
                  background: "#ffffff",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  minWidth: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <Text style={{ fontSize: 10, color: "#64748b" }}>Amount</Text>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                    {formatRoundedCurrency(amountValue)}
                  </div>
                </div>
                <Tag color={amountTone} style={{ margin: 0, borderRadius: 999, fontSize: 10 }}>
                  live total
                </Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm="auto">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(122px, 1fr) minmax(104px, 1fr)",
                gap: 8,
                minWidth: 236,
              }}
            >
              <Select
                size="middle"
                value={selectedMonth}
                onChange={onMonthChange}
                options={monthOptions}
                style={{ width: "100%" }}
              />
              <Select
                size="middle"
                value={selectedYear}
                onChange={onYearChange}
                options={yearOptions}
                style={{ width: "100%" }}
              />
            </div>
          </Col>
        </Row>
      </div>

      <div style={{ padding: 10 }}>
        <div
          style={{
            height: 360,
            borderRadius: 18,
            border: "1px solid rgba(226, 232, 240, 0.88)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
            padding: 10,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {chartData.length ? (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <div style={{ display: "grid", placeItems: "center" }}>
                <svg viewBox="0 0 340 340" style={{ width: "100%", maxWidth: 320, overflow: "visible" }}>
                  <circle cx={cx} cy={cy} r={outerRadius} fill="rgba(226, 232, 240, 0.22)" />
                  {donutSegments.map((segment, index) => {
                    return (
                      <g
                        key={`${segment.rank}-${segment.name}`}
                        onMouseEnter={() => setHoveredSlice(segment)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <path
                          d={segment.path}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          style={{ transition: "opacity 140ms ease" }}
                        />
                        {segment.sweep >= 22 ? (
                          <text
                            x={segment.labelPoint.x}
                            y={segment.labelPoint.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="16"
                            fontWeight="800"
                            style={{ pointerEvents: "none", textShadow: "0 2px 10px rgba(15, 23, 42, 0.28)" }}
                          >
                            {segment.rank}
                          </text>
                        ) : segment.sweep > 0 ? (
                          (() => {
                            const adjustedSegment = adjustedCalloutMap.get(segment.rank);
                            const calloutLabelY = adjustedSegment?.calloutLabelY ?? segment.outerLabelPoint.y;
                            const calloutBendX = adjustedSegment?.calloutBendX ?? segment.outerLabelPoint.x;
                            const isRightSide = segment.outerLabelPoint.x >= cx;

                            return (
                              <>
                                <path
                                  d={`M ${segment.outerLabelPoint.x} ${segment.outerLabelPoint.y} L ${calloutBendX} ${calloutLabelY} L ${segment.calloutEndX} ${calloutLabelY}`}
                                  fill="none"
                                  stroke={PIE_COLORS[index % PIE_COLORS.length]}
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ pointerEvents: "none" }}
                                />
                                <text
                                  x={segment.calloutEndX + (isRightSide ? 8 : -8)}
                                  y={calloutLabelY}
                                  textAnchor={isRightSide ? "start" : "end"}
                                  dominantBaseline="central"
                                  fill="#0f172a"
                                  fontSize="13"
                                  fontWeight="800"
                                  style={{ pointerEvents: "none" }}
                                >
                                  {segment.rank}
                                </text>
                              </>
                            );
                          })()
                        ) : null}
                      </g>
                    );
                  })}
                  <circle cx={cx} cy={cy} r={innerRadius - 6} fill="#ffffff" />
                  <text x={cx} y={cy - 12} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="700">
                    {hoveredSlice ? hoveredSlice.name : "Top 10"}
                  </text>
                  <text x={cx} y={cy + 18} textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="900">
                    {hoveredSlice ? formatRoundedCurrency(hoveredSlice.amount) : chartData.length}
                  </text>
                </svg>
              </div>
            </div>
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const RevenueTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: RevenueMonthRow }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background: "rgba(15, 23, 42, 0.94)",
        boxShadow: "0 18px 34px rgba(15, 23, 42, 0.24)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
      }}
    >
      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>{label}</Text>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "#ffffff" }}>
        {formatRoundedCurrency(row.totalRevenue)}
      </div>
      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
        <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 11 }}>
          Dealer: {formatRoundedCurrency(row.dealerRevenue)}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 11 }}>
          Retailer: {formatRoundedCurrency(row.retailerRevenue)}
        </Text>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [retailerBills, setRetailerBills] = useState<RetailerBillItem[]>([]);
  const [dealerBills, setDealerBills] = useState<DealerBillItem[]>([]);
  const [revenueRetailerBills, setRevenueRetailerBills] = useState<RetailerBillItem[]>([]);
  const [revenueDealerBills, setRevenueDealerBills] = useState<DealerBillItem[]>([]);
  const [allDealersCount, setAllDealersCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState(now.year());
  const [revenueYear, setRevenueYear] = useState(now.year());
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenueError, setRevenueError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryRes, retailerRes, dealerRes, dealersRes] = await Promise.all([
          getAdminDashboardSummary({
            month: selectedMonth,
            year: selectedYear,
          }),
          getAllAdminBills({
            month: selectedMonth,
            year: selectedYear,
          }),
          getAllDealerBills({
            month: selectedMonth,
            year: selectedYear,
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
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const loadRevenue = async () => {
      setRevenueLoading(true);
      setRevenueError("");

      try {
        const [retailerRes, dealerRes] = await Promise.all([
          getAllAdminBills({
            year: revenueYear,
          }),
          getAllDealerBills({
            year: revenueYear,
          }),
        ]);

        setRevenueRetailerBills(Array.isArray(retailerRes?.data) ? retailerRes.data : []);
        setRevenueDealerBills(Array.isArray(dealerRes?.data) ? dealerRes.data : []);
      } catch (err: any) {
        setRevenueError(
          err?.response?.data?.message || err?.message || "Failed to load revenue data",
        );
      } finally {
        setRevenueLoading(false);
      }
    };

    void loadRevenue();
  }, [revenueYear]);

  const yearOptions = useMemo(() => {
    const yearSet = new Set<number>(summary.availableYears?.length ? summary.availableYears : []);
    yearSet.add(selectedYear);
    yearSet.add(revenueYear);

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
  }, [dealerBills, retailerBills, revenueYear, selectedYear, summary.availableYears]);

  const filteredRetailerBills = useMemo(
    () =>
      retailerBills.filter((bill) => {
        if (!isCompletedStatus(bill.status)) return false;
        return isWithinFilter(
          toDate(bill.createdAt || bill.updatedAt),
          selectedMonth,
          selectedYear,
        );
      }),
    [retailerBills, selectedMonth, selectedYear],
  );

  const filteredDealerBills = useMemo(
    () =>
      dealerBills.filter((bill) =>
        isWithinFilter(
          toDate(bill.billDate || bill.createdAt || bill.updatedAt),
          selectedMonth,
          selectedYear,
        ),
      ),
    [dealerBills, selectedMonth, selectedYear],
  );

  const completedOrderAmount = filteredRetailerBills.reduce(
    (sum, bill) => sum + getRetailerAmount(bill),
    0,
  );
  const totalDealersCount = Number(summary.dealersCount ?? allDealersCount ?? 0);
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

  const revenueChartData = useMemo(() => {
    const dealerMonthlyTotals = Array.from({ length: 12 }, () => 0);
    const retailerMonthlyTotals = Array.from({ length: 12 }, () => 0);

    revenueDealerBills.forEach((bill) => {
      const parsed = toDate(bill.billDate || bill.createdAt || bill.updatedAt);
      if (!parsed || parsed.year() !== revenueYear) return;
      dealerMonthlyTotals[parsed.month()] += getDealerAmount(bill);
    });

    revenueRetailerBills.forEach((bill) => {
      if (!isCompletedStatus(bill.status)) return;
      const parsed = toDate(bill.createdAt || bill.updatedAt);
      if (!parsed || parsed.year() !== revenueYear) return;
      retailerMonthlyTotals[parsed.month()] += getRetailerAmount(bill);
    });

    return monthShortLabels.map((month, index) => ({
      month,
      dealerRevenue: dealerMonthlyTotals[index],
      retailerRevenue: retailerMonthlyTotals[index],
      totalRevenue: dealerMonthlyTotals[index] + retailerMonthlyTotals[index],
    }));
  }, [revenueDealerBills, revenueRetailerBills, revenueYear]);

  const totalRevenueAmount = useMemo(
    () => revenueChartData.reduce((sum, row) => sum + row.totalRevenue, 0),
    [revenueChartData],
  );

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
            <Row gutter={[12, 12]} align="stretch">
              {cards.map((card, index) => {
                const visual = TOP_CARD_STYLES[index];
                const CardIcon = card.icon;

                return (
                  <Col key={card.label} xs={24} sm={12} xl={6}>
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
                );
              })}
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
              <Row gutter={[12, 12]}>
                <Col xs={24} xl={12}>
                  <RankingPanel
                    title="Top 10 Dealers"
                    subtitle="Ranked by total bill amount in the selected period."
                    amountValue={dealerBillAmount}
                    amountTone="cyan"
                    countTone="green"
                    data={topDealers}
                    emptyText="No dealer bills found for this filter"
                    borderColor="1px solid rgba(0, 105, 92, 0.08)"
                    background="linear-gradient(180deg, #ffffff 0%, #f9fffd 100%)"
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    yearOptions={yearOptions}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                  />
                </Col>

                <Col xs={24} xl={12}>
                  <RankingPanel
                    title="Top 10 Retailers"
                    subtitle="Ranked by completed order amount."
                    amountValue={completedOrderAmount}
                    amountTone="purple"
                    countTone="blue"
                    data={topRetailers}
                    emptyText="No completed retailer orders found for this filter"
                    borderColor="1px solid rgba(29, 78, 216, 0.08)"
                    background="linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    yearOptions={yearOptions}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                  />
                </Col>
              </Row>

              <Card
                bordered={false}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(15, 118, 110, 0.08)",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
                  background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
                  overflow: "hidden",
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
                    background:
                      "linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(239,246,255,0.95) 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <Title level={5} style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>
                        Total Revenue
                      </Title>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        Monthly combined revenue from dealer and retailer bills.
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexWrap: "wrap",
                        marginLeft: "auto",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: 14,
                          background: "#ffffff",
                          border: "1px solid rgba(148, 163, 184, 0.14)",
                          minWidth: 220,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <Text style={{ fontSize: 10, color: "#64748b" }}>Year Revenue</Text>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                            {formatRoundedCurrency(totalRevenueAmount)}
                          </div>
                        </div>
                        <Tag color="green" style={{ margin: 0, borderRadius: 999, fontSize: 10 }}>
                          combined total
                        </Tag>
                      </div>

                      <div style={{ width: 118 }}>
                        <Select
                          size="middle"
                          value={revenueYear}
                          onChange={setRevenueYear}
                          options={yearOptions}
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 14 }}>
                  {revenueLoading ? (
                    <div style={{ minHeight: 320, display: "grid", placeItems: "center" }}>
                      <Spin size="large" />
                    </div>
                  ) : revenueError ? (
                    <Alert type="error" showIcon message={revenueError} />
                  ) : revenueChartData.some((row) => row.totalRevenue > 0) ? (
                    <div
                      style={{
                        height: 360,
                        borderRadius: 18,
                        border: "1px solid rgba(226, 232, 240, 0.88)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                        padding: 12,
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueChartData} margin={{ top: 10, right: 16, left: 4, bottom: 6 }}>
                          <defs>
                            <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.38} />
                              <stop offset="70%" stopColor="#0ea5e9" stopOpacity={0.12} />
                              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={72}
                            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                            tickFormatter={(value) => formatRoundedCurrency(Number(value))}
                          />
                          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "rgba(14, 165, 233, 0.18)", strokeWidth: 2 }} />
                          <Area
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="#0f766e"
                            strokeWidth={3}
                            fill="url(#revenueAreaFill)"
                            activeDot={{ r: 6, fill: "#0ea5e9", stroke: "#ffffff", strokeWidth: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div
                      style={{
                        minHeight: 320,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 18,
                        border: "1px solid rgba(226, 232, 240, 0.88)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                      }}
                    >
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No revenue data found for this year" />
                    </div>
                  )}
                </div>
              </Card>
            </Space>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Dashboard;
