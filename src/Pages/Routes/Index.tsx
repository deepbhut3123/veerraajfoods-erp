import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
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
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addAdminRoute,
  deleteAdminRoute,
  getAllAdminRoutes,
  getAllAdminShops,
  updateAdminRoute,
} from "../../Utils/Api";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

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

type RouteFormValues = {
  routeName: string;
  cityName: string;
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

const buildGoogleMapsMultiStopUrl = (locations: ShopCoordinate[]) => {
  if (!locations.length) {
    return "";
  }

  if (locations.length === 1) {
    return getGoogleMapsLink(locations[0]);
  }

  const toPoint = (location: ShopCoordinate) =>
    `${location.latitude},${location.longitude}`;

  const origin = toPoint(locations[0]);
  const destination = toPoint(locations[locations.length - 1]);
  const waypoints = locations
    .slice(1, -1)
    .map(toPoint)
    .join("|");

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const RoutesPage: React.FC = () => {
  const [data, setData] = useState<AdminRoute[]>([]);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeRoute, setActiveRoute] = useState<AdminRoute | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminRoute | null>(null);
  const [form] = Form.useForm<RouteFormValues>();

  const loadRoutes = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const [routesRes, shopsRes] = await Promise.all([
        getAllAdminRoutes({ search: search.trim() || undefined }),
        getAllAdminShops(),
      ]);
      setData(routesRes?.data || []);
      setShops(shopsRes?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load routes",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRoutes(searchText);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: AdminRoute) => {
    setEditingItem(item);
    form.setFieldsValue({
      routeName: item.routeName,
      cityName: item.cityName,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: RouteFormValues) => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateAdminRoute(editingItem._id, values);
        message.success("Route updated successfully");
      } else {
        await addAdminRoute(values);
        message.success("Route created successfully");
      }

      closeModal();
      await loadRoutes(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save route",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminRoute(id);
      message.success("Route deleted successfully");
      await loadRoutes(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete route",
      );
    }
  };

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

  const filteredData = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return data;
    }

    return data.filter((record) => {
      const shopCount = shops.filter((shop) =>
        shop.routeId?._id
          ? shop.routeId._id === record._id
          : shop.routeId?.routeName === record.routeName &&
            shop.routeId?.cityName === record.cityName,
      ).length;

      return [
        record.routeName,
        record.cityName,
        record.userId?.name,
        record.userId?.email,
        String(shopCount),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [data, searchText, shops]);

  const openAllShopsMap = () => {
    if (!routeShopLocations.length || !activeRoute) {
      return;
    }

    const mapsUrl = buildGoogleMapsMultiStopUrl(
      routeShopLocations.map((location) => ({
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    );

    if (mapsUrl) {
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    }
  };

  const columns: ColumnsType<AdminRoute> = [
    {
      title: "#",
      key: "serial",
      width: 72,
      render: (_, __, index) => index + 1,
    },
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
      title: "Shops In",
      key: "shopsIn",
      render: (_, record) => {
        const shopCount = shops.filter((shop) =>
          shop.routeId?._id
            ? shop.routeId._id === record._id
            : shop.routeId?.routeName === record.routeName &&
              shop.routeId?.cityName === record.cityName,
        ).length;

        return (
          <Tag
            style={{
              margin: 0,
              border: "none",
              background: "transparent",
              color: "#0f172a",
              fontSize: 15,
              fontWeight: 600,
              paddingInline: 0,
            }}
          >
            {shopCount}
          </Tag>
        );
      },
    },
    {
      title: "Locations",
      key: "locations",
      render: (_, record) => (
        <Tooltip title="View shops">
          <Button
            size="small"
            type="primary"
            icon={<EnvironmentOutlined />}
            onClick={() => setActiveRoute(record)}
            style={{
              borderRadius: 8,
              background: "#00695C",
              borderColor: "#00695C",
              width: 30,
              height: 30,
              padding: 0,
            }}
            aria-label="View shops"
          />
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit route">
            <Button
              type="text"
              aria-label="Edit route"
              onClick={() => openEdit(record)}
              icon={<EditOutlined />}
              style={{
                color: THEME.mid,
                borderRadius: 10,
                width: 36,
                height: 36,
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete route"
            description="Are you sure you want to delete this route?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="Delete route">
              <Button
                type="text"
                aria-label="Delete route"
                danger
                icon={<DeleteOutlined />}
                style={{
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
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
              Routes
            </Title>
          </div>
          <Space size={12} wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search routes, city, creator, shops count"
              style={{ width: 320 }}
            />
            <Button
              onClick={openCreate}
              icon={<PlusOutlined />}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontWeight: 600,
                background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
                boxShadow: "0 10px 20px rgba(0, 105, 92, 0.18)",
              }}
            >
              Add Route
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
            rowKey="_id"
            loading={loading}
            dataSource={filteredData}
            pagination={false}
            scroll={{ x: "max-content", y: 520 }}
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

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Route" : "Add Route"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Enter the route name and city for this record
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
        cancelButtonProps={{
          style: {
            borderRadius: 10,
          },
        }}
        destroyOnClose
        centered
        width={640}
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
              label="Route Name"
              name="routeName"
              rules={[{ required: true, message: "Please enter route name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter route name"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="City Name"
              name="cityName"
              rules={[{ required: true, message: "Please enter city name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter city name"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RoutesPage;
