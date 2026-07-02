import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getAdminAttendance, getAllUsers } from "../../Utils/Api";
import "./Index.css";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

dayjs.extend(customParseFormat);

type AttendanceItem = {
  _id?: string;
  id?: string;
  userId?: string;
  date: string;
  inTime?: string;
  outTime?: string;
  ipAddress?: string;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    roleId?: number;
  };
};

type UserOption = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  roleId: number;
};

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
  soft: "#E0F7F6",
};
const EXPECTED_ATTENDANCE_IP = "192.168.1.105";

const ATTENDANCE_TIME_FORMATS = [
  "YYYY-MM-DD hh:mm A",
  "YYYY-MM-DD h:mm A",
  "YYYY-MM-DD hh:mm a",
  "YYYY-MM-DD h:mm a",
  "DD MMM YYYY hh:mm A",
  "DD MMM YYYY h:mm A",
  "DD MMM YYYY hh:mm a",
  "DD MMM YYYY h:mm a",
  "hh:mm A",
  "h:mm A",
  "hh:mm a",
  "h:mm a",
];

const parseAttendanceDateTime = (value?: string, attendanceDate?: string) => {
  if (!value) {
    return null;
  }

  const parsedDirect = dayjs(value);
  if (parsedDirect.isValid()) {
    return parsedDirect;
  }

  if (attendanceDate) {
    const combinedValue = `${attendanceDate} ${value}`.trim();

    for (const format of ATTENDANCE_TIME_FORMATS) {
      const parsedWithDate = dayjs(combinedValue, format, true);
      if (parsedWithDate.isValid()) {
        return parsedWithDate;
      }
    }
  }

  for (const format of ATTENDANCE_TIME_FORMATS) {
    const parsedWithFormat = dayjs(value, format, true);
    if (parsedWithFormat.isValid()) {
      return parsedWithFormat;
    }
  }

  return null;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const formatTime = (value?: string, attendanceDate?: string) => {
  if (!value) {
    return "-";
  }

  const parsed = parseAttendanceDateTime(value, attendanceDate);
  return parsed && parsed.isValid() ? parsed.format("hh:mm A") : value;
};

const getDuration = (inTime?: string, outTime?: string, attendanceDate?: string) => {
  if (!inTime || !outTime) {
    return "-";
  }

  const start = parseAttendanceDateTime(inTime, attendanceDate);
  const end = parseAttendanceDateTime(outTime, attendanceDate);

  if (!start || !end || !start.isValid() || !end.isValid() || end.isBefore(start)) {
    return "-";
  }

  const diffMinutes = end.diff(start, "minute");
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}m`;
};

const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(
    null,
  );

  const currentUserRoleId = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("authData") || "{}");
    return Number(stored?.roleId ?? stored?.user?.roleId ?? 0);
  }, []);

  const isAdmin = currentUserRoleId === 1;

  const loadUsers = useCallback(async () => {
    try {
      const usersRes = await getAllUsers();
      setUsers(usersRes?.data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load users");
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminAttendance({
        search: search || undefined,
        userId: selectedUserId || undefined,
        fromDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        toDate: dateRange?.[1]?.format("YYYY-MM-DD"),
      });
      setRecords(response?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load attendance records",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, isAdmin, search, selectedUserId]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadUsers();
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const userOptions = useMemo(
    () =>
      users
        .filter((user) => user.roleId === 5)
        .map((user) => ({
        value: user._id || user.id || "",
        label: `${user.name} (${user.email})`,
        })),
    [users],
  );

  const columns: ColumnsType<AttendanceItem> = [
    {
      title: "User",
      key: "user",
      width: 230,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.user?.name || "Unknown user"}</Text>
          <Text type="secondary">{record.user?.email || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 130,
      render: (value) => <Text>{formatDate(value)}</Text>,
    },
    {
      title: "In Time",
      dataIndex: "inTime",
      key: "inTime",
      width: 180,
      render: (value, record) => <Text>{formatTime(value, record.date)}</Text>,
    },
    {
      title: "Out Time",
      dataIndex: "outTime",
      key: "outTime",
      width: 180,
      render: (value, record) => <Text>{formatTime(value, record.date)}</Text>,
    },
    {
      title: "Hours",
      key: "duration",
      width: 110,
      render: (_, record) => (
        <Text>{getDuration(record.inTime, record.outTime, record.date)}</Text>
      ),
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 150,
      render: (value) => {
        const isExpectedIp = !value || value === EXPECTED_ATTENDANCE_IP;

        return (
          <Tag
            style={{
              margin: 0,
              borderRadius: 999,
              padding: "4px 12px",
              border: isExpectedIp
                ? "1px solid rgba(15, 23, 42, 0.08)"
                : "1px solid rgba(220, 38, 38, 0.22)",
              background: isExpectedIp ? "rgba(15, 23, 42, 0.03)" : "rgba(220, 38, 38, 0.08)",
              color: isExpectedIp ? "#0f172a" : "#b91c1c",
              fontFamily: "monospace",
              fontWeight: isExpectedIp ? 500 : 700,
            }}
          >
            {value || "-"}
          </Tag>
        );
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 50px)",
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(180deg, #f6fbfb 0%, #eef6f5 45%, #f8fafc 100%)",
          padding: 20,
        }}
      >
        <Card
          bordered={false}
          style={{
            maxWidth: 520,
            width: "100%",
            borderRadius: 24,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
            textAlign: "center",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Attendance records are available to admin users only."
          />
        </Card>
      </div>
    );
  }

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
            marginBottom: 20,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
              Attendance
            </Title>
            <Text type="secondary">
              View mobile-app attendance, in time, out time, and network IP for staff users.
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAttendance}
            style={{
              height: 42,
              paddingInline: 18,
              borderRadius: 12,
              borderColor: "rgba(0, 105, 92, 0.24)",
              color: THEME.mid,
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>
        </Space>

        <Card
          bordered={false}
          style={{
            marginBottom: 20,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${THEME.soft} 0%, #ffffff 100%)`,
            border: "1px solid rgba(0, 105, 92, 0.1)",
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Input
              size="large"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by staff name, email, or IP"
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              style={{ borderRadius: 12 }}
            />

            <Select
              size="large"
              allowClear
              showSearch
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value)}
              placeholder="Filter by staff user"
              options={userOptions}
            />

            <RangePicker
              size="large"
              value={dateRange}
              onChange={(value) =>
                setDateRange(
                  value ? [value[0] || null, value[1] || null] : null,
                )
              }
              style={{ width: "100%" }}
              format="DD MMM YYYY"
            />
          </div>

        </Card>

        {error ? (
          <Text type="danger">{error}</Text>
        ) : (
          <Table
            rowKey={(record) => record._id || record.id || `${record.userId}-${record.date}`}
            loading={loading}
            dataSource={records}
            columns={columns}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: "max-content", y: 520 }}
            rowClassName={(record) =>
              record.ipAddress && record.ipAddress !== EXPECTED_ATTENDANCE_IP
                ? "attendance-alert-row"
                : ""
            }
          />
        )}
      </Card>
    </div>
  );
};

export default AttendancePage;
