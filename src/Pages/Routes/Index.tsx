import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Modal, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EnvironmentOutlined } from "@ant-design/icons";
import { getAllAdminRoutes, getAllAdminShops } from "../../Utils/Api";

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

type AdminShop = {
  _id: string;
  shopName: string;
  shopAddress?: string;
  mobileNumber?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  location?: {
    lat?: number | string;
    lng?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    coordinates?: [number, number] | number[];
  };
  coordinates?: [number, number] | number[];
  routeId?: {
    _id?: string;
    routeName?: string;
    cityName?: string;
  };
};

type ShopCoordinate = {
  latitude: number;
  longitude: number;
};

const getCoordinateValue = (value?: number | string) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getShopCoordinates = (shop: AdminShop): ShopCoordinate | null => {
  const directLatitude = getCoordinateValue(shop.latitude ?? shop.lat);
  const directLongitude = getCoordinateValue(shop.longitude ?? shop.lng);

  if (directLatitude !== null && directLongitude !== null) {
    return { latitude: directLatitude, longitude: directLongitude };
  }

  const nestedLatitude = getCoordinateValue(shop.location?.latitude ?? shop.location?.lat);
  const nestedLongitude = getCoordinateValue(shop.location?.longitude ?? shop.location?.lng);

  if (nestedLatitude !== null && nestedLongitude !== null) {
    return { latitude: nestedLatitude, longitude: nestedLongitude };
  }

  const coordinates = shop.location?.coordinates || shop.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const longitude = getCoordinateValue(coordinates[0]);
    const latitude = getCoordinateValue(coordinates[1]);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
  }

  return null;
};

const getGoogleMapsLink = (coordinates: ShopCoordinate) =>
  `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RoutesPage: React.FC = () => {
  const [data, setData] = useState<AdminRoute[]>([]);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRoute, setActiveRoute] = useState<AdminRoute | null>(null);

  useEffect(() => {
    const loadRoutes = async () => {
      setLoading(true);
      setError("");

      try {
        const [routesRes, shopsRes] = await Promise.all([
          getAllAdminRoutes(),
          getAllAdminShops(),
        ]);
        setData(routesRes?.data || []);
        setShops(shopsRes?.data || []);
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

  const routeShops = useMemo(() => {
    if (!activeRoute) {
      return [];
    }

    return shops.filter((shop) => {
      if (shop.routeId?._id && activeRoute._id) {
        return shop.routeId._id === activeRoute._id;
      }

      return (
        shop.routeId?.routeName === activeRoute.routeName &&
        shop.routeId?.cityName === activeRoute.cityName
      );
    });
  }, [activeRoute, shops]);

  const routeShopLocations = useMemo(
    () =>
      routeShops
        .map((shop) => {
          const coordinates = getShopCoordinates(shop);

          if (!coordinates) {
            return null;
          }

          return {
            name: shop.shopName || "Shop",
            address: shop.shopAddress || "-",
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          };
        })
        .filter(
          (
            location,
          ): location is {
            name: string;
            address: string;
            latitude: number;
            longitude: number;
          } => Boolean(location),
        ),
    [routeShops],
  );

  const openAllShopsMap = () => {
    if (!routeShopLocations.length || !activeRoute) {
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");

    if (!popup) {
      return;
    }

    const title = `${activeRoute.routeName}${activeRoute.cityName ? ` - ${activeRoute.cityName}` : ""} Shops Map`;
    const locationsJson = JSON.stringify(routeShopLocations).replace(/</g, "\\u003c");

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(title)}</title>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossorigin=""
          />
          <style>
            body {
              margin: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              background: #f6fbfb;
              color: #0f172a;
            }
            .header {
              padding: 16px 20px;
              border-bottom: 1px solid rgba(0, 105, 92, 0.14);
              background: #ffffff;
            }
            .title {
              margin: 0;
              color: #004d40;
              font-size: 22px;
            }
            .subtitle {
              margin: 6px 0 0;
              color: #475569;
              font-size: 14px;
            }
            #map {
              height: calc(100vh - 84px);
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${escapeHtml(title)}</h1>
            <p class="subtitle">${routeShopLocations.length} shop location${routeShopLocations.length > 1 ? "s" : ""} marked on the map</p>
          </div>
          <div id="map"></div>
          <script
            src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""
          ></script>
          <script>
            const locations = ${locationsJson};
            const map = L.map("map");
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              maxZoom: 19,
              attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);

            const bounds = [];

            locations.forEach((location) => {
              const marker = L.marker([location.latitude, location.longitude]).addTo(map);
              marker.bindPopup(
                "<strong>" +
                  location.name +
                  "</strong><br />" +
                  location.address +
                  "<br />" +
                  location.latitude +
                  ", " +
                  location.longitude,
              );
              bounds.push([location.latitude, location.longitude]);
            });

            if (bounds.length === 1) {
              map.setView(bounds[0], 15);
            } else {
              map.fitBounds(bounds, { padding: [30, 30] });
            }
          </script>
        </body>
      </html>
    `);

    popup.document.close();
  };

  const columns: ColumnsType<AdminRoute> = [
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
    {
      title: "Locations",
      key: "locations",
      render: (_, record) => {
        const shopCount = shops.filter((shop) =>
          shop.routeId?._id
            ? shop.routeId._id === record._id
            : shop.routeId?.routeName === record.routeName &&
              shop.routeId?.cityName === record.cityName,
        ).length;

        return (
          <Button
            type="primary"
            icon={<EnvironmentOutlined />}
            onClick={() => setActiveRoute(record)}
            style={{
              borderRadius: 10,
              background: "#00695C",
              borderColor: "#00695C",
            }}
          >
            View Shops ({shopCount})
          </Button>
        );
      },
    },
  ];

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
            columns={columns}
          />
        )}
      </Card>

      <Modal
        open={Boolean(activeRoute)}
        onCancel={() => setActiveRoute(null)}
        footer={null}
        width={920}
        title={
          activeRoute
            ? `${activeRoute.routeName}${activeRoute.cityName ? ` - ${activeRoute.cityName}` : ""} Shops`
            : "Route Shops"
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Text type="secondary">
              {routeShops.length
                ? `Showing ${routeShops.length} shop location${routeShops.length > 1 ? "s" : ""} for this route.`
                : "No shops found for this route."}
            </Text>

            <Button
              type="primary"
              icon={<EnvironmentOutlined />}
              disabled={!routeShopLocations.length}
              onClick={openAllShopsMap}
              style={{
                borderRadius: 10,
                background: "#00695C",
                borderColor: "#00695C",
              }}
            >
              Open All Shops On Map
            </Button>
          </div>

          {routeShops.map((shop) => {
            const coordinates = getShopCoordinates(shop);

            return (
              <Card
                key={shop._id}
                size="small"
                bordered={false}
                style={{
                  background: "#f7fffd",
                  border: "1px solid rgba(0, 105, 92, 0.1)",
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <Space direction="vertical" size={4}>
                    <Text strong>{shop.shopName}</Text>
                    <Text>{shop.shopAddress || "-"}</Text>
                    <Text type="secondary">Mobile: {shop.mobileNumber || "-"}</Text>
                    <Text type="secondary">
                      Coordinates:{" "}
                      {coordinates
                        ? `${coordinates.latitude}, ${coordinates.longitude}`
                        : "Location not available"}
                    </Text>
                  </Space>

                  <Button
                    type="default"
                    icon={<EnvironmentOutlined />}
                    disabled={!coordinates}
                    href={coordinates ? getGoogleMapsLink(coordinates) : undefined}
                    target="_blank"
                    rel="noreferrer"
                    style={{ borderRadius: 10 }}
                  >
                    Open Map
                  </Button>
                </div>
              </Card>
            );
          })}
        </Space>
      </Modal>
    </div>
  );
};

export default RoutesPage;
