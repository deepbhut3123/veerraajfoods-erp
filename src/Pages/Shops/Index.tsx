import React, { useEffect, useState } from "react";
import { Alert, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getAllAdminShops } from "../../Utils/Api";

const { Title } = Typography;

type AdminShop = {
  _id: string;
  shopName: string;
  shopAddress: string;
  mobileNumber: string;
  createdAt?: string;
  routeId?: {
    routeName?: string;
    cityName?: string;
  };
  userId?: {
    name?: string;
    email?: string;
    roleId?: number;
  };
};

const ShopsPage: React.FC = () => {
  const [data, setData] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadShops = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getAllAdminShops();
        setData(res?.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to load shops",
        );
      } finally {
        setLoading(false);
      }
    };

    loadShops();
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
          Shops
        </Title>

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
                title: "Shop Name",
                dataIndex: "shopName",
                key: "shopName",
              },
              {
                title: "Address",
                dataIndex: "shopAddress",
                key: "shopAddress",
              },
              {
                title: "Mobile",
                dataIndex: "mobileNumber",
                key: "mobileNumber",
              },
              {
                title: "Route",
                key: "routeId",
                render: (_, record) =>
                  record.routeId?.routeName ? (
                    <Tag color="green">
                      {record.routeId.routeName}
                      {record.routeId.cityName ? ` - ${record.routeId.cityName}` : ""}
                    </Tag>
                  ) : (
                    <Tag>Unassigned</Tag>
                  ),
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
            ] as ColumnsType<AdminShop>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default ShopsPage;
