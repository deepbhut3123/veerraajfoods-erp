import React, { useEffect, useState } from "react";
import { Alert, Card, Col, Row, Spin, Typography } from "antd";
import { getAdminDashboardSummary } from "../Utils/Api";

const { Title, Text } = Typography;

type DashboardSummary = {
  routesCount: number;
  shopsCount: number;
};

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>({
    routesCount: 0,
    shopsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getAdminDashboardSummary();
        setSummary(res?.data || { routesCount: 0, shopsCount: 0 });
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

    loadSummary();
  }, []);

  const cards = [
    {
      label: "All Routes",
      value: summary.routesCount,
      color: "#0f766e",
      background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    },
    {
      label: "All Shops",
      value: summary.shopsCount,
      color: "#1d4ed8",
      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 50px)",
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
          <Title level={3} style={{ marginBottom: 4 }}>
            Admin Dashboard
          </Title>
          <Text type="secondary">
            Live counts from the backend for every route and shop.
          </Text>
        </div>

        {loading ? (
          <div style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} />
        ) : (
          <Row gutter={[16, 16]}>
            {cards.map((card) => (
              <Col key={card.label} xs={24} md={12}>
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
                      fontSize: 44,
                      lineHeight: 1.1,
                      fontWeight: 800,
                      marginTop: 12,
                      color: "#0f172a",
                    }}
                  >
                    {card.value}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
