import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  getAccountDeletionRequests,
  updateAccountDeletionRequest,
} from "../../Utils/Api";
import "./Index.css";

const { Title, Text } = Typography;

type AccountDeletionRequestItem = {
  _id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  roleId: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt?: string;
  reviewedAt?: string | null;
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
    mobileNumber?: string;
    roleId?: number;
    isActive?: boolean;
  };
};

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

const roleLabel = (roleId?: number) => {
  switch (Number(roleId)) {
    case 1:
      return "Admin";
    case 2:
      return "Retailer";
    case 3:
      return "Dealer";
    case 4:
      return "Salesman";
    case 5:
      return "Staff";
    case 6:
      return "Delivery Man";
    default:
      return "User";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "blue";
    case "rejected":
      return "red";
    case "completed":
      return "green";
    default:
      return "gold";
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AccountDeletionRequestsPage: React.FC = () => {
  const [data, setData] = useState<AccountDeletionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const pendingCount = useMemo(
    () => data.filter((item) => item.status === "pending").length,
    [data],
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccountDeletionRequests({ status, search: search.trim() });
      setData(res?.data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateStatus = async (id: string, nextStatus: string) => {
    setUpdatingId(id);
    try {
      await updateAccountDeletionRequest(id, { status: nextStatus });
      message.success("Request updated successfully");
      await loadRequests();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to update request");
    } finally {
      setUpdatingId("");
    }
  };

  const columns: ColumnsType<AccountDeletionRequestItem> = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.userId?.name || record.name}</Text>
          <Text type="secondary">{record.userId?.email || record.email || "-"}</Text>
          <Text type="secondary">{record.userId?.mobileNumber || record.mobileNumber || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Role",
      key: "roleId",
      render: (_, record) => roleLabel(record.userId?.roleId || record.roleId),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value: string) => <Tag color={statusColor(value)}>{value.toUpperCase()}</Tag>,
    },
    {
      title: "Requested At",
      dataIndex: "requestedAt",
      render: formatDate,
    },
    {
      title: "Reviewed At",
      dataIndex: "reviewedAt",
      render: formatDate,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button
            icon={<CheckCircleOutlined />}
            loading={updatingId === record._id}
            onClick={() => updateStatus(record._id, "approved")}
            size="small"
            type="primary"
          >
            Approve
          </Button>
          <Button
            loading={updatingId === record._id}
            onClick={() => updateStatus(record._id, "completed")}
            size="small"
          >
            Complete
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            loading={updatingId === record._id}
            onClick={() => updateStatus(record._id, "rejected")}
            size="small"
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="account-deletion-page">
      <Card className="account-deletion-card">
        <div className="account-deletion-header">
          <div>
            <Title level={3}>Account Deletion Requests</Title>
            <Text type="secondary">
              Review mobile app users who requested account and data deletion.
            </Text>
          </div>
          <Tag color="gold">Pending: {pendingCount}</Tag>
        </div>

        <div className="account-deletion-toolbar">
          <Input
            allowClear
            onChange={(event) => setSearch(event.target.value)}
            onPressEnter={loadRequests}
            placeholder="Search name, email, or mobile"
            prefix={<SearchOutlined />}
            value={search}
          />
          <Select options={STATUS_OPTIONS} onChange={setStatus} value={status} />
          <Button icon={<ReloadOutlined />} onClick={loadRequests}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="_id"
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default AccountDeletionRequestsPage;



