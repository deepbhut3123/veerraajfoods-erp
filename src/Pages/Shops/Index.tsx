import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
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
  AimOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  addAdminShop,
  deleteAdminShop,
  getAllAdminRoutes,
  getAllAdminShops,
  updateAdminShop,
} from "../../Utils/Api";
import "leaflet/dist/leaflet.css";

const { Title, Text } = Typography;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type AdminShop = {
  _id: string;
  shopName: string;
  shopNameGujarati?: string;
  shopAddress: string;
  mobileNumber: string;
  latitude?: number | string;
  longitude?: number | string;
  shopImage?: string;
  createdAt?: string;
  routeId?: {
    _id?: string;
    routeName?: string;
    routeNameGujarati?: string;
    cityName?: string;
    cityNameGujarati?: string;
  };
  userId?: {
    name?: string;
    email?: string;
    roleId?: number;
  };
};

type AdminRoute = {
  _id: string;
  routeName: string;
  routeNameGujarati?: string;
  cityName: string;
  cityNameGujarati?: string;
};

type ShopFormValues = {
  routeId: string;
  shopName: string;
  shopNameGujarati?: string;
  shopAddress: string;
  mobileNumber: string;
  latitude?: number;
  longitude?: number;
};

const getRouteLabel = (
  route: Pick<AdminRoute, "routeName" | "routeNameGujarati" | "cityName" | "cityNameGujarati">,
) => {
  const routeName = [route.routeName, route.routeNameGujarati].filter(Boolean).join(" / ");
  const cityName = [route.cityName, route.cityNameGujarati].filter(Boolean).join(" / ");
  return cityName ? `${routeName} - ${cityName}` : routeName;
};

const DEFAULT_MAP_CENTER: [number, number] = [23.0225, 72.5714];

const ShopLocationPicker: React.FC<{
  position: [number, number];
  onSelect: (nextPosition: [number, number]) => void;
}> = ({ position, onSelect }) => {
  useMapEvents({
    click: (event) => {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  return (
    <CircleMarker
      center={position}
      radius={10}
      pathOptions={{
        color: "#00695C",
        fillColor: "#14b8a6",
        fillOpacity: 0.78,
        weight: 3,
      }}
    />
  );
};

const ShopMapViewport: React.FC<{
  isOpen: boolean;
  position: [number, number];
}> = ({ isOpen, position }) => {
  const map = useMap();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      map.invalidateSize();
      map.setView(position, map.getZoom(), { animate: false });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [isOpen, map, position]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    map.setView(position, map.getZoom(), { animate: false });
  }, [isOpen, map, position]);

  return null;
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

const getGoogleMapsLink = (latitude?: number | string, longitude?: number | string) => {
  const lat = getCoordinateValue(latitude);
  const lng = getCoordinateValue(longitude);

  if (lat === null || lng === null) {
    return "";
  }

  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const ShopsPage: React.FC = () => {
  const [data, setData] = useState<AdminShop[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminShop | null>(null);
  const [selectedMapPosition, setSelectedMapPosition] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [form] = Form.useForm<ShopFormValues>();

  const loadShops = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const [shopsRes, routesRes] = await Promise.all([
        getAllAdminShops({ search: search.trim() || undefined }),
        getAllAdminRoutes(),
      ]);
      setData(shopsRes?.data || []);
      setRoutes(routesRes?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load shops",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadShops(searchText);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: AdminShop) => {
    setEditingItem(item);
    form.setFieldsValue({
      routeId: item.routeId?._id,
      shopName: item.shopName,
      shopNameGujarati: item.shopNameGujarati,
      shopAddress: item.shopAddress,
      mobileNumber: item.mobileNumber,
      latitude:
        item.latitude !== undefined && item.latitude !== null
          ? Number(item.latitude)
          : undefined,
      longitude:
        item.longitude !== undefined && item.longitude !== null
          ? Number(item.longitude)
          : undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setMapModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const openMapModal = () => {
    const currentLatitude = form.getFieldValue("latitude");
    const currentLongitude = form.getFieldValue("longitude");
    const lat = typeof currentLatitude === "number" ? currentLatitude : Number(currentLatitude);
    const lng = typeof currentLongitude === "number" ? currentLongitude : Number(currentLongitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setSelectedMapPosition([lat, lng]);
    } else {
      setSelectedMapPosition(DEFAULT_MAP_CENTER);
    }

    setMapModalOpen(true);
  };

  const applySelectedLocation = () => {
    form.setFieldsValue({
      latitude: Number(selectedMapPosition[0].toFixed(6)),
      longitude: Number(selectedMapPosition[1].toFixed(6)),
    });
    setMapModalOpen(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error("Geolocation is not supported in this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedMapPosition([
          Number(position.coords.latitude),
          Number(position.coords.longitude),
        ]);
      },
      () => {
        message.error("Failed to fetch current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const selectedMapCenter = useMemo<LatLngExpression>(
    () => [selectedMapPosition[0], selectedMapPosition[1]],
    [selectedMapPosition],
  );

  const handleSubmit = async (values: ShopFormValues) => {
    setSaving(true);

    try {
      const payload = {
        routeId: values.routeId,
        shopName: values.shopName,
        ...(values.shopNameGujarati?.trim()
          ? { shopNameGujarati: values.shopNameGujarati.trim() }
          : {}),
        shopAddress: values.shopAddress,
        mobileNumber: values.mobileNumber,
        ...(values.latitude !== undefined ? { latitude: values.latitude } : {}),
        ...(values.longitude !== undefined ? { longitude: values.longitude } : {}),
      };

      if (editingItem) {
        await updateAdminShop(editingItem._id, payload);
        message.success("Shop updated successfully");
      } else {
        await addAdminShop(payload);
        message.success("Shop created successfully");
      }

      closeModal();
      await loadShops(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to save shop",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminShop(id);
      message.success("Shop deleted successfully");
      await loadShops(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to delete shop",
      );
    }
  };

  const columns: ColumnsType<AdminShop> = [
    {
      title: "#",
      key: "serial",
      width: 72,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Shop Name",
      dataIndex: "shopName",
      key: "shopName",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.shopName}</Text>
          {record.shopNameGujarati ? <Text type="secondary">{record.shopNameGujarati}</Text> : null}
        </Space>
      ),
    },
    {
      title: "Mobile Number",
      dataIndex: "mobileNumber",
      key: "mobileNumber",
    },
    {
      title: "Route Name",
      key: "routeId",
      render: (_, record) =>
        record.routeId?.routeName ? (
          <Tag color="green">
            {[record.routeId.routeName, record.routeId.routeNameGujarati].filter(Boolean).join(" / ")}
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
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const mapsLink = getGoogleMapsLink(record.latitude, record.longitude);

        return (
          <Space size="small">
            <Tooltip title={mapsLink ? "Open location in Google Maps" : "Location not available"}>
              <Button
                type="text"
                aria-label="Open shop location"
                icon={<EnvironmentOutlined />}
                disabled={!mapsLink}
                href={mapsLink || undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: mapsLink ? THEME.mid : undefined,
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                }}
              />
            </Tooltip>
            <Tooltip title="Edit shop">
              <Button
                type="text"
                aria-label="Edit shop"
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
              title="Delete shop"
              description="Are you sure you want to delete this shop?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record._id)}
            >
              <Tooltip title="Delete shop">
                <Button
                  type="text"
                  aria-label="Delete shop"
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
        );
      },
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
              Shops
            </Title>
          </div>
          <Space size={12} wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search shops, route, creator, address, mobile"
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
              Add Shop
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
            dataSource={data}
            pagination={false}
            scroll={{ x: "max-content", y: 520 }}
            columns={columns}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Shop" : "Add Shop"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Enter the shop details and assign a route
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
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        destroyOnClose
        centered
        width={760}
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
          <Form.Item
            label="Route"
            name="routeId"
            rules={[{ required: true, message: "Please select route" }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              size="large"
              placeholder="Select route"
              options={routes.map((route) => ({
                value: route._id,
                label: getRouteLabel(route),
              }))}
            />
          </Form.Item>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Form.Item
              label="Shop Name"
              name="shopName"
              rules={[{ required: true, message: "Please enter shop name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter shop name"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Shop Name (Gujarati)"
              name="shopNameGujarati"
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="ગુજરાતી દુકાન નામ લખો"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Mobile Number"
              name="mobileNumber"
              rules={[
                { required: true, message: "Please enter mobile number" },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                placeholder="Enter mobile number"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Shop Address"
            name="shopAddress"
            rules={[{ required: true, message: "Please enter shop address" }]}
            style={{ marginTop: 16, marginBottom: 0 }}
          >
            <Input.TextArea
              rows={3}
              placeholder="Enter shop address"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Form.Item
              label="Latitude"
              name="latitude"
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={-90}
                max={90}
                step={0.000001}
                style={{ width: "100%" }}
                size="large"
                placeholder="Optional latitude"
              />
            </Form.Item>

            <Form.Item
              label="Longitude"
              name="longitude"
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={-180}
                max={180}
                step={0.000001}
                style={{ width: "100%" }}
                size="large"
                placeholder="Optional longitude"
              />
            </Form.Item>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(0, 105, 92, 0.12)",
              background: "linear-gradient(180deg, rgba(240,253,250,0.92) 0%, rgba(255,255,255,1) 100%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Text strong style={{ color: THEME.dark, display: "block" }}>
                Location Picker
              </Text>
              <Text type="secondary">
                Select location from map if latitude and longitude are not known.
              </Text>
            </div>
            <Button
              icon={<EnvironmentOutlined />}
              onClick={openMapModal}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                borderColor: "rgba(0, 105, 92, 0.2)",
                color: THEME.mid,
                fontWeight: 600,
              }}
            >
              Pick On Map
            </Button>
          </div>

          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              Leave latitude and longitude empty if you do not want to save location.
            </Text>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Select Shop Location"
        open={mapModalOpen}
        onCancel={() => setMapModalOpen(false)}
        onOk={applySelectedLocation}
        okText="Use This Location"
        width={860}
        centered
        destroyOnClose
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Space size={16} wrap>
              <div>
                <Text type="secondary" style={{ display: "block" }}>
                  Latitude
                </Text>
                <Text strong>{selectedMapPosition[0].toFixed(6)}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ display: "block" }}>
                  Longitude
                </Text>
                <Text strong>{selectedMapPosition[1].toFixed(6)}</Text>
              </div>
            </Space>

            <Button
              icon={<AimOutlined />}
              onClick={useCurrentLocation}
              style={{
                borderRadius: 10,
                borderColor: "rgba(0, 105, 92, 0.2)",
                color: THEME.mid,
                fontWeight: 600,
              }}
            >
              Use Current Location
            </Button>
          </div>

          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(0, 105, 92, 0.12)",
            }}
          >
            <MapContainer
              center={selectedMapCenter}
              zoom={15}
              style={{ height: 420, width: "100%" }}
              scrollWheelZoom
            >
              <ShopMapViewport
                isOpen={mapModalOpen}
                position={selectedMapPosition}
              />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ShopLocationPicker
                position={selectedMapPosition}
                onSelect={setSelectedMapPosition}
              />
            </MapContainer>
          </div>

          <Text type="secondary">
            Click anywhere on the map to set the shop location, then confirm to fill latitude and longitude.
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default ShopsPage;
