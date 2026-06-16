import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
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
  PlusOutlined,
} from "@ant-design/icons";
import {
  addUser,
  deleteUser,
  getAllUsers,
  updateUser,
  updateUserActiveStatus,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;

type UserItem = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  roleId: number;
  isActive: boolean;
};

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

const statusMeta = (isActive: boolean) =>
  isActive
    ? {
        label: "Active",
        color: "#0f766e",
        background: "rgba(0, 105, 92, 0.08)",
      }
    : {
        label: "Inactive",
        color: "#64748b",
        background: "rgba(100, 116, 139, 0.08)",
      };

const roleMeta = (roleId?: number) =>
  roleId === 1
    ? {
        label: "Admin",
        color: "#0f766e",
        background: "rgba(0, 105, 92, 0.08)",
        border: "rgba(0, 105, 92, 0.18)",
      }
    : {
        label: "User",
        color: "#475569",
        background: "rgba(148, 163, 184, 0.12)",
        border: "rgba(148, 163, 184, 0.2)",
      };

const UsersPage: React.FC = () => {
  const [data, setData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  const currentUserId = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("authData") || "{}");
    return stored?.user?._id || stored?.user?.id || "";
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllUsers();
      setData(res?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ roleId: 2, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (item: UserItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      email: item.email,
      roleId: item.roleId,
      isActive: item.isActive,
      password: "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: UserFormValues) => {
    setSaving(true);
    try {
      if (editingItem) {
        const payload: any = {
          name: values.name,
          email: values.email,
          roleId: values.roleId,
          isActive: values.isActive,
        };

        if (values.password && values.password.trim()) {
          payload.password = values.password;
        }

        await updateUser(editingItem._id || editingItem.id || "", payload);
        message.success("User updated successfully");
      } else {
        await addUser({
          name: values.name,
          email: values.email,
          password: values.password || "",
          roleId: values.roleId,
          isActive: values.isActive,
        });
        message.success("User created successfully");
      }

      closeModal();
      await loadUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success("User deleted successfully");
      await loadUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete user");
    }
  };

  const toggleStatus = async (record: UserItem, checked: boolean) => {
    try {
      await updateUserActiveStatus(record._id || record.id || "", checked);
      message.success(`User ${checked ? "activated" : "deactivated"} successfully`);
      await loadUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to update status");
    }
  };

  const columns: ColumnsType<UserItem> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      key: "roleId",
      render: (_, record) => {
        const meta = roleMeta(record.roleId);

        return (
          <Tag
            style={{
              margin: 0,
              borderRadius: 999,
              padding: "2px 10px",
              border: `1px solid ${meta.border}`,
              background: meta.background,
              color: meta.color,
              fontWeight: 600,
              letterSpacing: 0.2,
            }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      key: "isActive",
      render: (_, record) => (
        <Space
          size={8}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: statusMeta(record.isActive).background,
          }}
        >
          <Switch
            checked={record.isActive}
            onChange={(checked) => toggleStatus(record, checked)}
            size="small"
            style={{
              backgroundColor: record.isActive ? "#0f766e" : "#94a3b8",
            }}
          />
          <Tag
            style={{
              margin: 0,
              border: "none",
              background: "transparent",
              color: statusMeta(record.isActive).color,
              padding: 0,
              fontWeight: 600,
            }}
          >
            {statusMeta(record.isActive).label}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const recordId = record._id || record.id || "";
        const isSelf = recordId === currentUserId;

        return (
          <Space size="small">
            <Tooltip title="Edit user">
              <Button
                type="text"
                aria-label="Edit user"
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
              title="Delete user"
              description="Are you sure you want to delete this user?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(recordId)}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? "You cannot delete yourself" : "Delete user"}>
                <Button
                  type="text"
                  aria-label="Delete user"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isSelf}
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
          overflow: "hidden",
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
              Users
            </Title>
          </div>
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
            Add User
          </Button>
        </Space>

        {error ? (
          <div style={{ marginTop: 16 }}>
            <Text type="danger">{error}</Text>
          </div>
        ) : (
          <Table
            style={{ marginTop: 20 }}
            rowKey={(record) => record._id || record.id || record.email}
            loading={loading}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            columns={columns}
            rowClassName={() => "user-row"}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit User" : "Add User"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Register a new user or update user access
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
        width={720}
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
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter name" }]}
              style={{ marginBottom: 0 }}
            >
              <Input size="large" placeholder="Enter name" style={{ borderRadius: 12 }} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: "Please enter email" }]}
              style={{ marginBottom: 0 }}
            >
              <Input size="large" placeholder="Enter email" style={{ borderRadius: 12 }} />
            </Form.Item>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <Form.Item
              label="Password"
              name="password"
              rules={
                editingItem
                  ? []
                  : [{ required: true, message: "Please enter password" }]
              }
              style={{ marginBottom: 0 }}
            >
              <Input.Password
                size="large"
                placeholder={editingItem ? "Leave blank to keep password" : "Enter password"}
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              label="Role"
              name="roleId"
              rules={[{ required: true, message: "Please select role" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                options={[
                  { value: 1, label: "Admin" },
                  { value: 2, label: "User" },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ marginTop: 16 }}>
            <Form.Item
              label="Account Status"
              name="isActive"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
