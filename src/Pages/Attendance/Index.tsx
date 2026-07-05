import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  TimePicker,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  EditOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  getAdminAttendance,
  getAllUsers,
  updateAdminAttendance,
} from "../../Utils/Api";
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
  breakIn?: string;
  breakOut?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  salary?: number | null;
};

type AttendanceFormValues = {
  userId: string;
  date: dayjs.Dayjs;
  inTime: dayjs.Dayjs;
  outTime?: dayjs.Dayjs | null;
  breakIn?: dayjs.Dayjs | null;
  breakOut?: dayjs.Dayjs | null;
  latitude?: number | null;
  longitude?: number | null;
};

type AttendanceStatementFormValues = {
  userId: string;
  month: number;
  year: number;
};

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
  soft: "#E0F7F6",
};

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
  const diffMinutes = getDurationMinutes(inTime, outTime, attendanceDate);

  if (diffMinutes === null) {
    return "-";
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}m`;
};

const getDurationMinutes = (inTime?: string, outTime?: string, attendanceDate?: string) => {
  if (!inTime || !outTime) {
    return null;
  }

  const start = parseAttendanceDateTime(inTime, attendanceDate);
  const end = parseAttendanceDateTime(outTime, attendanceDate);

  if (!start || !end || !start.isValid() || !end.isValid() || end.isBefore(start)) {
    return null;
  }

  return end.diff(start, "minute");
};

const getAttendanceRecordId = (record: AttendanceItem) =>
  record._id || record.id || `${record.userId}-${record.date}`;

const formatHoursFromMinutes = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  const totalMinutes = Math.max(0, Number(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};

const getDecimalHoursFromMinutes = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value) / 60;
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPdfCurrency = (value?: number | null) =>
  `Rs ${Number(value || 0).toFixed(2)}`;

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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<AttendanceItem | null>(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementGenerating, setStatementGenerating] = useState(false);
  const [editForm] = Form.useForm<AttendanceFormValues>();
  const [statementForm] = Form.useForm<AttendanceStatementFormValues>();

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

  const openEdit = (item: AttendanceItem) => {
    const attendanceDate = dayjs(item.date);
    const inTime = parseAttendanceDateTime(item.inTime, item.date);
    const outTime = parseAttendanceDateTime(item.outTime, item.date);
    const breakIn = parseAttendanceDateTime(item.breakIn, item.date);
    const breakOut = parseAttendanceDateTime(item.breakOut, item.date);

    editForm.setFieldsValue({
      userId: item.userId || item.user?._id || item.user?.id || "",
      date: attendanceDate.isValid() ? attendanceDate : dayjs(),
      inTime: inTime && inTime.isValid() ? inTime : dayjs(),
      outTime: outTime && outTime.isValid() ? outTime : null,
      breakIn: breakIn && breakIn.isValid() ? breakIn : null,
      breakOut: breakOut && breakOut.isValid() ? breakOut : null,
      latitude:
        item.latitude === null || item.latitude === undefined || item.latitude === ""
          ? null
          : Number(item.latitude),
      longitude:
        item.longitude === null || item.longitude === undefined || item.longitude === ""
          ? null
          : Number(item.longitude),
    });

    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setEditingItem(null);
    editForm.resetFields();
  };

  const handleSubmit = async (values: AttendanceFormValues) => {
    if (!editingItem) {
      return;
    }

    setSaving(true);

    try {
      const recordId = editingItem._id || editingItem.id;

      if (!recordId) {
        throw new Error("Attendance record id is missing");
      }

      await updateAdminAttendance(recordId, {
        userId: values.userId,
        date: values.date.format("YYYY-MM-DD"),
        inTime: values.inTime.format("hh:mm A"),
        outTime: values.outTime ? values.outTime.format("hh:mm A") : undefined,
        breakIn: values.breakIn ? values.breakIn.format("hh:mm A") : undefined,
        breakOut: values.breakOut ? values.breakOut.format("hh:mm A") : undefined,
        latitude:
          values.latitude === null || values.latitude === undefined
            ? undefined
            : Number(values.latitude),
        longitude:
          values.longitude === null || values.longitude === undefined
            ? undefined
            : Number(values.longitude),
        ipAddress: editingItem.ipAddress?.trim() || undefined,
      });

      message.success("Attendance updated successfully");
      closeModal();
      await loadAttendance();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to update attendance",
      );
      setSaving(false);
    }
  };

  const openStatementModal = () => {
    statementForm.setFieldsValue({
      userId: selectedUserId || undefined,
      month: dayjs().month(),
      year: dayjs().year(),
    });
    setStatementModalOpen(true);
  };

  const closeStatementModal = () => {
    setStatementModalOpen(false);
    setStatementGenerating(false);
    statementForm.resetFields();
  };

  const handleGenerateStatement = async (values: AttendanceStatementFormValues) => {
    setStatementGenerating(true);

    try {
      const monthStart = dayjs()
        .year(values.year)
        .month(values.month)
        .startOf("month");
      const monthEnd = monthStart.endOf("month");

      const response = await getAdminAttendance({
        userId: values.userId,
        fromDate: monthStart.format("YYYY-MM-DD"),
        toDate: monthEnd.format("YYYY-MM-DD"),
      });

      const staffUser = users.find((user) => (user._id || user.id) === values.userId);
      const statementRecords: AttendanceItem[] = (Array.isArray(response?.data) ? response.data : [])
        .filter(
          (record: AttendanceItem) =>
            (record.userId || record.user?._id || record.user?.id) === values.userId,
        )
        .sort((left: AttendanceItem, right: AttendanceItem) => {
          const dateDiff = dayjs(left.date).valueOf() - dayjs(right.date).valueOf();
          if (dateDiff !== 0) {
            return dateDiff;
          }

          const leftIn = parseAttendanceDateTime(left.inTime, left.date)?.valueOf() || 0;
          const rightIn = parseAttendanceDateTime(right.inTime, right.date)?.valueOf() || 0;
          return leftIn - rightIn;
        });

      const totalMinutes = statementRecords.reduce(
        (sum: number, record: AttendanceItem) =>
          sum + (getDurationMinutes(record.inTime, record.outTime, record.date) || 0),
        0,
      );
      const hourlySalary = Number(staffUser?.salary || 0);
      const totalSalary = getDecimalHoursFromMinutes(totalMinutes) * hourlySalary;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 36;
      const marginTop = 42;
      const contentWidth = pageWidth - marginX * 2;
      const rowHeight = 24;
      const colWidths = [120, 110, 110, contentWidth - 340];
      const monthLabel = monthStart.format("MMMM YYYY");
      const staffName = staffUser?.name || statementRecords[0]?.user?.name || "Staff User";

      const drawCell = (
        x: number,
        y: number,
        width: number,
        height: number,
        text: string,
        options?: {
          align?: "left" | "center" | "right";
          bold?: boolean;
          fill?: [number, number, number];
          fontSize?: number;
        },
      ) => {
        doc.setDrawColor(180, 196, 201);
        doc.setLineWidth(0.8);

        if (options?.fill) {
          doc.setFillColor(...options.fill);
          doc.rect(x, y, width, height, "FD");
        } else {
          doc.rect(x, y, width, height);
        }

        doc.setFont("helvetica", options?.bold ? "bold" : "normal");
        doc.setFontSize(options?.fontSize || 10);
        doc.setTextColor(15, 23, 42);

        const align = options?.align || "left";
        const textX =
          align === "left" ? x + 8 : align === "right" ? x + width - 8 : x + width / 2;

        doc.text(String(text || "-"), textX, y + height / 2 + 4, { align });
      };

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 77, 64);
        doc.text("Attendance Statement", marginX, marginTop);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(staffName, marginX, marginTop + 24);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(monthLabel, marginX, marginTop + 42);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Hourly Salary: ${formatPdfCurrency(hourlySalary)}`, marginX, marginTop + 58);
      };

      const drawTableHeader = (y: number) => {
        let cursorX = marginX;
        ["Date", "In Time", "Out Time", "Total Hours"].forEach((label, index) => {
          drawCell(cursorX, y, colWidths[index], rowHeight, label, {
            align: "center",
            bold: true,
            fill: [224, 247, 246],
          });
          cursorX += colWidths[index];
        });
      };

      drawHeader();

      let cursorY = marginTop + 82;
      drawTableHeader(cursorY);
      cursorY += rowHeight;

      if (!statementRecords.length) {
        drawCell(marginX, cursorY, contentWidth, rowHeight, "No attendance records found", {
          align: "center",
        });
        cursorY += rowHeight;
      } else {
        statementRecords.forEach((record: AttendanceItem) => {
          if (cursorY + rowHeight > pageHeight - 60) {
            doc.addPage();
            drawHeader();
            cursorY = marginTop + 82;
            drawTableHeader(cursorY);
            cursorY += rowHeight;
          }

          const rowValues = [
            formatDate(record.date),
            formatTime(record.inTime, record.date),
            formatTime(record.outTime, record.date),
            getDuration(record.inTime, record.outTime, record.date),
          ];

          let cursorX = marginX;
          rowValues.forEach((value, index) => {
            drawCell(cursorX, cursorY, colWidths[index], rowHeight, value, {
              align: index === 0 ? "left" : "center",
            });
            cursorX += colWidths[index];
          });

          cursorY += rowHeight;
        });
      }

      if (cursorY + rowHeight > pageHeight - 60) {
        doc.addPage();
        drawHeader();
        cursorY = marginTop + 82;
        drawTableHeader(cursorY);
        cursorY += rowHeight;
      }

      let totalRowX = marginX;
      drawCell(totalRowX, cursorY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, "Total Hours", {
        align: "right",
        bold: true,
        fill: [240, 253, 250],
      });
      totalRowX += colWidths[0] + colWidths[1] + colWidths[2];
      drawCell(totalRowX, cursorY, colWidths[3], rowHeight, formatHoursFromMinutes(totalMinutes), {
        align: "center",
        bold: true,
        fill: [240, 253, 250],
      });

      cursorY += rowHeight;
      totalRowX = marginX;
      drawCell(totalRowX, cursorY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, "Total Salary", {
        align: "right",
        bold: true,
        fill: [240, 253, 250],
      });
      totalRowX += colWidths[0] + colWidths[1] + colWidths[2];
      drawCell(totalRowX, cursorY, colWidths[3], rowHeight, formatPdfCurrency(totalSalary), {
        align: "center",
        bold: true,
        fill: [240, 253, 250],
      });

      doc.save(
        `attendance-statement-${staffName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${monthStart.format("MM-YYYY")}.pdf`,
      );

      closeStatementModal();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to generate attendance statement",
      );
      setStatementGenerating(false);
    }
  };

  const statementYearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 7 }, (_, index) => currentYear - index).map((year) => ({
      value: year,
      label: String(year),
    }));
  }, []);

  const statementMonthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        value: month,
        label: dayjs().month(month).format("MMMM"),
      })),
    [],
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
      title: "Break In",
      dataIndex: "breakIn",
      key: "breakIn",
      width: 180,
      render: (value, record) => <Text>{formatTime(value, record.date)}</Text>,
    },
    {
      title: "Break Out",
      dataIndex: "breakOut",
      key: "breakOut",
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
      title: "Location",
      key: "location",
      width: 180,
      render: (_, record) => (
        <Text>
          {record.latitude !== null &&
          record.latitude !== undefined &&
          record.longitude !== null &&
          record.longitude !== undefined
            ? `${record.latitude}, ${record.longitude}`
            : "-"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 96,
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="Edit attendance">
          <Button
            type="text"
            aria-label="Edit attendance"
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
      ),
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
              View mobile-app attendance, shift timings, break timings, and staff location data.
            </Text>
          </div>
          <Space size={12} wrap>
            <Button
              icon={<FilePdfOutlined />}
              onClick={openStatementModal}
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
              Statement
            </Button>
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
              placeholder="Search by staff name or email"
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
            rowKey={getAttendanceRecordId}
            loading={loading}
            dataSource={records}
            columns={columns}
            pagination={false}
            scroll={{ x: "max-content", y: 420 }}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              Edit Attendance
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Update staff, date, timings, break slots, and location for this attendance entry
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => editForm.submit()}
        okText="Save Changes"
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
        <Form form={editForm} layout="vertical" onFinish={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Staff User"
              name="userId"
              rules={[{ required: true, message: "Please select staff user" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                showSearch
                placeholder="Select staff user"
                options={userOptions}
              />
            </Form.Item>

            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please select date" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="DD MMM YYYY"
              />
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
              label="In Time"
              name="inTime"
              rules={[{ required: true, message: "Please select in time" }]}
              style={{ marginBottom: 0 }}
            >
              <TimePicker
                size="large"
                use12Hours
                format="hh:mm A"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              label="Out Time"
              name="outTime"
              style={{ marginBottom: 0 }}
            >
              <TimePicker
                size="large"
                use12Hours
                format="hh:mm A"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item
                label="Break In"
                name="breakIn"
                style={{ marginBottom: 0 }}
              >
                <TimePicker
                  size="large"
                  use12Hours
                  format="hh:mm A"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="Break Out"
                name="breakOut"
                style={{ marginBottom: 0 }}
              >
                <TimePicker
                  size="large"
                  use12Hours
                  format="hh:mm A"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item
                label="Latitude"
                name="latitude"
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  size="large"
                  placeholder="Enter latitude"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="Longitude"
                name="longitude"
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  size="large"
                  placeholder="Enter longitude"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              Attendance Statement
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Select staff, month, and year to generate attendance PDF
            </span>
          </div>
        }
        open={statementModalOpen}
        onCancel={closeStatementModal}
        onOk={() => statementForm.submit()}
        okText="Generate PDF"
        okButtonProps={{
          loading: statementGenerating,
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        destroyOnClose
        centered
        width={620}
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
        <Form form={statementForm} layout="vertical" onFinish={handleGenerateStatement}>
          <Form.Item
            label="Staff User"
            name="userId"
            rules={[{ required: true, message: "Please select staff user" }]}
          >
            <Select
              size="large"
              showSearch
              placeholder="Select staff user"
              options={userOptions}
            />
          </Form.Item>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Month"
              name="month"
              rules={[{ required: true, message: "Please select month" }]}
            >
              <Select
                size="large"
                placeholder="Select month"
                options={statementMonthOptions}
              />
            </Form.Item>

            <Form.Item
              label="Year"
              name="year"
              rules={[{ required: true, message: "Please select year" }]}
            >
              <Select
                size="large"
                placeholder="Select year"
                options={statementYearOptions}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
