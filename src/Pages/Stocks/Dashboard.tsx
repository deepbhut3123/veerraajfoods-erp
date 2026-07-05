import React, { useEffect, useMemo, useState } from "react";
import { Card, Empty, Progress, Select, Space, Spin, Tabs, Tag, Typography, message } from "antd";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChartOutlined, InboxOutlined, RiseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllAdminStockEntries, getAllProducts } from "../../Utils/Api";

const { Title, Text } = Typography;

const THEME = {
  dark: "#0f3d3e",
  mid: "#00695C",
  gold: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
};

type ProductOption = {
  _id?: string;
  id?: string;
  productName: string;
  mrp: number;
  productRate: number;
  currentStock?: number;
};

type StockEntryItem = {
  productId: string | { _id?: string; id?: string; productName?: string; mrp?: number; productRate?: number };
  productName: string;
  mrp: number;
  productRate: number;
  quantity: number;
  total: number;
};

type StockEntryRow = {
  _id?: string;
  id?: string;
  entryDate: string;
  totalAmount: number;
  items: StockEntryItem[];
};

type TrendPoint = {
  day: string;
  quantity: number;
  value: number;
};

type LiveStockRow = {
  key: string;
  item: string;
  available: number;
  rate: number;
  mrp: number;
  stockValue: number;
  lastEntryDate: string;
  fillPercent: number;
  status: "active" | "low" | "idle";
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPlainNumber = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const getProductIdValue = (productId?: StockEntryItem["productId"]) =>
  typeof productId === "object" ? productId?._id || productId?.id || "" : productId || "";

const getProductKey = (product?: ProductOption) => product?._id || product?.id || "";

const StocksDashboardPage: React.FC = () => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [entries, setEntries] = useState<StockEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [productsRes, entriesRes] = await Promise.all([
          getAllProducts(),
          getAllAdminStockEntries(),
        ]);

        setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
        setEntries(Array.isArray(entriesRes?.data) ? entriesRes.data : []);
      } catch (err: any) {
        message.error(
          err?.response?.data?.message || err?.message || "Failed to load stocks dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();

    entries.forEach((entry) => {
      const parsed = dayjs(entry.entryDate);
      if (parsed.isValid()) {
        months.add(parsed.format("YYYY-MM"));
      }
    });

    if (!months.size) {
      months.add(dayjs().format("YYYY-MM"));
    }

    return Array.from(months)
      .sort((left, right) => dayjs(right).valueOf() - dayjs(left).valueOf())
      .map((value) => ({
        value,
        label: dayjs(`${value}-01`).format("MMMM YYYY"),
      }));
  }, [entries]);

  useEffect(() => {
    if (!monthOptions.some((option) => option.value === selectedMonth) && monthOptions[0]) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const parsed = dayjs(entry.entryDate);
        return parsed.isValid() && parsed.format("YYYY-MM") === selectedMonth;
      }),
    [entries, selectedMonth],
  );

  const trendData = useMemo<TrendPoint[]>(() => {
    const trendMap = new Map<string, TrendPoint>();

    filteredEntries.forEach((entry) => {
      const parsed = dayjs(entry.entryDate);
      if (!parsed.isValid()) {
        return;
      }

      const key = parsed.format("YYYY-MM-DD");
      const current = trendMap.get(key) || {
        day: parsed.format("DD MMM"),
        quantity: 0,
        value: 0,
      };

      current.quantity += (entry.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      );
      current.value += Number(entry.totalAmount || 0);

      trendMap.set(key, current);
    });

    return Array.from(trendMap.entries())
      .sort((left, right) => dayjs(left[0]).valueOf() - dayjs(right[0]).valueOf())
      .map(([, value]) => value);
  }, [filteredEntries]);

  const liveStockRows = useMemo<LiveStockRow[]>(() => {
    const stockMap = new Map<
      string,
      {
        item: string;
        available: number;
        rate: number;
        mrp: number;
        stockValue: number;
        lastEntryDate: string;
      }
    >();

    products.forEach((product) => {
      const key = getProductKey(product);
      if (!key) {
        return;
      }

      stockMap.set(key, {
        item: product.productName,
        available: Math.max(0, Number(product.currentStock || 0)),
        rate: Number(product.productRate || 0),
        mrp: Number(product.mrp || 0),
        stockValue: Math.max(0, Number(product.currentStock || 0)) * Number(product.productRate || 0),
        lastEntryDate: "",
      });
    });

    entries.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const key = getProductIdValue(item.productId);
        if (!key) {
          return;
        }

        const current = stockMap.get(key) || {
          item: item.productName || "Unknown Product",
          available: 0,
          rate: Number(item.productRate || 0),
          mrp: Number(item.mrp || 0),
          stockValue: 0,
          lastEntryDate: "",
        };

        current.item = current.item || item.productName || "Unknown Product";
        current.rate = Number(item.productRate || current.rate || 0);
        current.mrp = Number(item.mrp || current.mrp || 0);

        if (!current.lastEntryDate || dayjs(entry.entryDate).isAfter(dayjs(current.lastEntryDate))) {
          current.lastEntryDate = entry.entryDate;
        }

        stockMap.set(key, current);
      });
    });

    const maxAvailable = Math.max(
      1,
      ...Array.from(stockMap.values()).map((item) => Math.max(0, Number(item.available || 0))),
    );

    return Array.from(stockMap.entries())
      .map(([key, value]) => {
        const available = Math.max(0, Number(value.available || 0));
        const fillPercent = Math.min(100, Math.round((available / maxAvailable) * 100));
        const status: LiveStockRow["status"] =
          available <= 0 ? "idle" : available < maxAvailable * 0.25 ? "low" : "active";

        return {
          key,
          item: value.item,
          available,
          rate: value.rate,
          mrp: value.mrp,
          stockValue: available * Number(value.rate || 0),
          lastEntryDate: value.lastEntryDate,
          fillPercent,
          status,
        };
      })
      .sort((left, right) => right.available - left.available || left.item.localeCompare(right.item));
  }, [entries, products]);

  const monthQuantity = useMemo(
    () =>
      filteredEntries.reduce(
        (sum, entry) =>
          sum + (entry.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0,
      ),
    [filteredEntries],
  );

  const monthValue = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0),
    [filteredEntries],
  );

  const totalAvailable = useMemo(
    () => liveStockRows.reduce((sum, row) => sum + Number(row.available || 0), 0),
    [liveStockRows],
  );

  const totalStockValue = useMemo(
    () => liveStockRows.reduce((sum, row) => sum + Number(row.stockValue || 0), 0),
    [liveStockRows],
  );

  const lowStockCount = useMemo(
    () => liveStockRows.filter((row) => row.status === "low" || row.status === "idle").length,
    [liveStockRows],
  );

  const topStockItem = liveStockRows[0];

  const metricCards = [
    {
      key: "available",
      label: "Current Total Stock",
      value: formatNumber(totalAvailable),
      hint: "Combined quantity across every product currently tracked",
      accent: "linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%)",
    },
    {
      key: "month-qty",
      label: "This Month Quantity",
      value: formatNumber(monthQuantity),
      hint: "Total quantity entered in the selected month",
      accent: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
    },
    {
      key: "month-value",
      label: "Live Stock Value",
      value: formatCurrency(totalStockValue),
      hint: "Current live stock value across all products",
      accent: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    },
    {
      key: "low",
      label: "Low / Empty Products",
      value: `${lowStockCount}`,
      hint: "Products needing fresh entry attention soon",
      accent: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          height: "calc(100vh - 50px)",
          overflowY: "auto",
          display: "grid",
          placeItems: "center",
          padding: 20,
          background:
            "radial-gradient(circle at top left, rgba(13, 148, 136, 0.14) 0%, rgba(13, 148, 136, 0) 32%), radial-gradient(circle at top right, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 28%), linear-gradient(180deg, #f4fbfa 0%, #eef5fb 48%, #f8fafc 100%)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        height: "calc(100vh - 50px)",
        overflowY: "auto",
        background:
          "radial-gradient(circle at top left, rgba(13, 148, 136, 0.14) 0%, rgba(13, 148, 136, 0) 32%), radial-gradient(circle at top right, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0) 28%), linear-gradient(180deg, #f4fbfa 0%, #eef5fb 48%, #f8fafc 100%)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(0, 105, 92, 0.08)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          marginBottom: 20,
          background:
            "linear-gradient(135deg, rgba(240,253,250,0.98) 0%, rgba(255,255,255,0.96) 50%, rgba(239,246,255,0.98) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
              Stocks Dashboard
            </Title>
            <Text type="secondary">
              Product-wise live stock count for every saved retailer product.
            </Text>
          </div>

          <Select
            size="large"
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={monthOptions}
            style={{ width: 180 }}
          />
        </div>
      </Card>

      <div
        style={{
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {metricCards.map((card) => (
          <div
            key={card.key}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              padding: 20,
              color: "#fff",
              background: card.accent,
              boxShadow: "0 18px 30px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto -10% -45% auto",
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.14)",
              }}
            />
            <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 13 }}>{card.label}</Text>
            <Title level={2} style={{ color: "#fff", margin: "10px 0 4px" }}>
              {card.value}
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.8)" }}>{card.hint}</Text>
          </div>
        ))}
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          border: "1px solid rgba(148, 163, 184, 0.14)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <Tabs
          defaultActiveKey="products"
          items={[
            {
              key: "products",
              label: "Product Stock",
              children: (
                <div>
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between", marginBottom: 18, gap: 16 }}
                  >
                    <div>
                      <Title level={4} style={{ marginBottom: 2, color: THEME.dark }}>
                        Product Wise Live Stock Count
                      </Title>
                      <Text type="secondary">
                        Every product is showing its current live quantity from the saved stock entries
                      </Text>
                    </div>
                    <Tag
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        padding: "6px 12px",
                        border: "1px solid rgba(37, 99, 235, 0.12)",
                        background: "rgba(37, 99, 235, 0.08)",
                        color: THEME.blue,
                        fontWeight: 700,
                      }}
                    >
                      {`${liveStockRows.length} Products`}
                    </Tag>
                  </Space>

                  {liveStockRows.length ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {liveStockRows.map((record) => {
                        const isLow = record.status !== "active";
                        const label =
                          record.status === "idle" ? "No Stock" : record.status === "low" ? "Low Stock" : "Healthy";

                        return (
                          <div
                            key={record.key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              borderRadius: 20,
                              padding: 18,
                              border: "1px solid rgba(148, 163, 184, 0.16)",
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.96) 100%)",
                              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "flex-start",
                                minHeight: 52,
                                marginBottom: 12,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flex: 1,
                                  minWidth: 0,
                                  paddingRight: 8,
                                }}
                              >
                                <Text strong style={{ fontSize: 16, color: THEME.dark, margin: 0 }}>
                                  {formatPlainNumber(record.mrp)}
                                </Text>
                                <Text
                                  type="secondary"
                                  style={{
                                    margin: 0,
                                    flex: 1,
                                    minWidth: 0,
                                    lineHeight: 1.35,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {record.item}
                                </Text>
                              </div>

                              <Tag
                                style={{
                                  margin: 0,
                                  flexShrink: 0,
                                  border: "none",
                                  borderRadius: 999,
                                  padding: "4px 10px",
                                  fontWeight: 700,
                                  background: isLow ? "rgba(220, 38, 38, 0.12)" : "rgba(0, 105, 92, 0.1)",
                                  color: isLow ? THEME.red : THEME.mid,
                                }}
                              >
                                {label}
                              </Tag>
                            </div>

                            <div
                              style={{
                                marginBottom: 14,
                                padding: "16px 18px",
                                borderRadius: 18,
                                background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
                                color: "#fff",
                              }}
                            >
                              <Text style={{ color: "rgba(255,255,255,0.84)" }}>Available Stock</Text>
                              <Title level={1} style={{ color: "#fff", margin: "4px 0 0", fontSize: 36 }}>
                                {formatNumber(record.available)}
                              </Title>
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "center",
                                }}
                              >
                                <Text type="secondary">Stock Value</Text>
                                <Text strong style={{ color: THEME.mid }}>
                                  {formatCurrency(record.stockValue)}
                                </Text>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "center",
                                }}
                              >
                                <Text type="secondary">Rate</Text>
                                <Text strong>{formatCurrency(record.rate)}</Text>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "center",
                                }}
                              >
                                <Text type="secondary">Last Entry</Text>
                                <Text strong>{formatDate(record.lastEntryDate)}</Text>
                              </div>
                            </div>

                            <div style={{ marginTop: 14 }}>
                              <Progress
                                percent={record.fillPercent}
                                showInfo={false}
                                strokeColor={isLow ? THEME.red : THEME.mid}
                                trailColor="rgba(148, 163, 184, 0.18)"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty description="No live stock data available yet" />
                  )}
                </div>
              ),
            },
            {
              key: "analytics",
              label: "Chart & Snapshot",
              children: (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 20,
                  }}
                >
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(148, 163, 184, 0.14)",
                      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <Space
                      align="start"
                      style={{ width: "100%", justifyContent: "space-between", marginBottom: 18 }}
                    >
                      <div>
                        <Title level={4} style={{ marginBottom: 2, color: THEME.dark }}>
                          Monthly Stock Flow
                        </Title>
                        <Text type="secondary">Daily quantity and value for the selected month</Text>
                      </div>
                      <Tag
                        icon={<BarChartOutlined />}
                        style={{
                          margin: 0,
                          borderRadius: 999,
                          padding: "6px 12px",
                          border: "1px solid rgba(0, 105, 92, 0.12)",
                          background: "rgba(224, 247, 246, 0.8)",
                          color: THEME.mid,
                          fontWeight: 700,
                        }}
                      >
                        {dayjs(`${selectedMonth}-01`).format("MMMM YYYY")}
                      </Tag>
                    </Space>

                    {trendData.length ? (
                      <div style={{ width: "100%", height: 320 }}>
                        <ResponsiveContainer>
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                            <defs>
                              <linearGradient id="stockQtyFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.36} />
                                <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="stockValueFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="quantity" stroke="#0f766e" fill="url(#stockQtyFill)" strokeWidth={3} />
                            <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#stockValueFill)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <Empty description="No stock entries available for the selected month" />
                    )}
                  </Card>

                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(148, 163, 184, 0.14)",
                      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
                    }}
                  >
                    <Title level={4} style={{ marginBottom: 4, color: THEME.dark }}>
                      Quick Snapshot
                    </Title>
                    <Text type="secondary">Secondary overview for value and low-stock products</Text>

                    <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
                      {[
                        {
                          title: "This Month Stock Value",
                          value: formatCurrency(monthValue),
                          icon: <InboxOutlined />,
                          color: THEME.mid,
                          background: "rgba(224, 247, 246, 0.9)",
                        },
                        {
                          title: "Low / Empty Products",
                          value: `${lowStockCount} Items`,
                          icon: <RiseOutlined />,
                          color: THEME.gold,
                          background: "rgba(254, 243, 199, 0.9)",
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: 18,
                            borderRadius: 18,
                            background: item.background,
                          }}
                        >
                          <div>
                            <Text type="secondary">{item.title}</Text>
                            <Title level={4} style={{ margin: "4px 0 0", color: item.color }}>
                              {item.value}
                            </Title>
                          </div>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: 16,
                              background: "#fff",
                              color: item.color,
                              fontSize: 20,
                            }}
                          >
                            {item.icon}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 18,
                        borderRadius: 20,
                        padding: 18,
                        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                        color: "#fff",
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.8)" }}>Top Live Product</Text>
                      <Title level={2} style={{ color: "#fff", margin: "8px 0 4px" }}>
                        {topStockItem?.item || "No Product"}
                      </Title>
                      <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                        {topStockItem
                          ? `${formatNumber(topStockItem.available)} units | ${formatCurrency(topStockItem.stockValue)} value`
                          : "No stock entry data available yet"}
                      </Text>
                    </div>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default StocksDashboardPage;
