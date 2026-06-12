import React, { useEffect, useState } from "react";
import { Alert, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getAllAdminRoutes } from "../../Utils/Api";

const { Title, Text } = Typography;

type AdminRoute = {
  _id: string;
  routeName: string;
  cityName: string;
  createdAt?: string;
  userId?: {
    name?: string;
    email?: string;
    roleId?: number;
  };
};

const RoutesPage: React.FC = () => {
  const [data, setData] = useState<AdminRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRoutes = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getAllAdminRoutes();
        setData(res?.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load routes",
        );
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Title level={3} style={{ marginBottom: 4 }}>
          Routes
        </Title>
        <Text type="secondary">Admin view of all routes in the system.</Text>

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
            pagination={{ pageSize: 10 }}
            columns={
              [
              {
                title: "Route Name",
                dataIndex: "routeName",
                key: "routeName",
              },
              {
                title: "City",
                dataIndex: "cityName",
                key: "cityName",
              },
              {
                title: "Created By",
                key: "userId",
                render: (_, record) =>
                  record.userId?.name ? (
                    <Tag color="blue">{record.userId.name}</Tag>
                  ) : (
                    <Tag>Unknown</Tag>
                  ),
              },
            ] as ColumnsType<AdminRoute>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default RoutesPage;
