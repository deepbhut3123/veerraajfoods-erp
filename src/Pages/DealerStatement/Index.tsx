import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { getAllDealerBills, getAllDealers, getAllDealerPayments } from "../../Utils/Api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

type DealerOption = {
  _id: string;
  dealerName: string;
  contactNo?: string;
  city?: string;
};

type DealerBillLineItem = {
  productName?: string;
  quantity?: number;
};

type DealerBillRecord = {
  _id: string;
  billDate?: string;
  totalAmount?: number;
  items?: DealerBillLineItem[];
};

type DealerPaymentRecord = {
  _id: string;
  paymentDate?: string;
  amount?: number;
  paymentType?: "cash" | "online" | "bank";
};

type StatementRow = {
  key: string;
  dateValue: string;
  dateLabel: string;
  entryType: "bill" | "payment";
  product: string;
  billAmount: number;
  paymentAmount: number;
  balance: number;
  paymentType?: string;
};

const formatAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : "-";
};

const getPaymentTypeTone = (value?: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "bank") {
    return { color: "#1d4ed8", background: "rgba(59, 130, 246, 0.12)" };
  }

  if (normalized === "online") {
    return { color: "#7c3aed", background: "rgba(124, 58, 237, 0.12)" };
  }

  return { color: "#0f766e", background: "rgba(15, 118, 110, 0.12)" };
};

const getBillProductsLabel = (items?: DealerBillLineItem[]) => {
  if (!Array.isArray(items) || !items.length) {
    return "Bill entry";
  }

  return items
    .map((item) => {
      const name = item.productName?.trim() || "Item";
      const quantity = Number(item.quantity || 0);
      return quantity > 0 ? `${name} x ${quantity}` : name;
    })
    .join(", ");
};

const DealerStatementPage: React.FC = () => {
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>();
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [loading, setLoading] = useState(false);
  const [dealerLoading, setDealerLoading] = useState(true);
  const [error, setError] = useState("");
  const [bills, setBills] = useState<DealerBillRecord[]>([]);
  const [payments, setPayments] = useState<DealerPaymentRecord[]>([]);

  useEffect(() => {
    const loadDealers = async () => {
      setDealerLoading(true);

      try {
        const response = await getAllDealers();
        setDealers(Array.isArray(response?.data) ? response.data : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dealers",
        );
      } finally {
        setDealerLoading(false);
      }
    };

    void loadDealers();
  }, []);

  useEffect(() => {
    const hasValidRange = Boolean(dateRange?.[0] && dateRange?.[1]);

    if (!hasValidRange || !selectedDealerId) {
      setBills([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    const loadStatement = async () => {
      setLoading(true);
      setError("");

      try {
        const fromDate = dateRange?.[0]?.format("YYYY-MM-DD");
        const toDate = dateRange?.[1]?.format("YYYY-MM-DD");

        const [billsRes, paymentsRes] = await Promise.all([
          getAllDealerBills({
            dealerId: selectedDealerId,
            fromDate,
            toDate,
          }),
          getAllDealerPayments({
            dealerId: selectedDealerId,
            fromDate,
            toDate,
          }),
        ]);

        setBills(Array.isArray(billsRes?.data) ? billsRes.data : []);
        setPayments(Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dealer statement",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadStatement();
  }, [dateRange, selectedDealerId]);

  const dealerOptions = useMemo(
    () =>
      dealers.map((dealer) => ({
        value: dealer._id,
        label: dealer.contactNo
          ? `${dealer.dealerName} - ${dealer.contactNo}`
          : dealer.dealerName,
      })),
    [dealers],
  );

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer._id === selectedDealerId) || null,
    [dealers, selectedDealerId],
  );

  const statementRows = useMemo(() => {
    const rows = [
      ...bills.map((bill) => ({
        key: `bill-${bill._id}`,
        dateValue: bill.billDate || "",
        entryType: "bill" as const,
        product: getBillProductsLabel(bill.items),
        billAmount: Number(bill.totalAmount || 0),
        paymentAmount: 0,
        paymentType: undefined,
      })),
      ...payments.map((payment) => ({
        key: `payment-${payment._id}`,
        dateValue: payment.paymentDate || "",
        entryType: "payment" as const,
        product: "Payment received",
        billAmount: 0,
        paymentAmount: Number(payment.amount || 0),
        paymentType: payment.paymentType,
      })),
    ]
      .filter((item) => dayjs(item.dateValue).isValid())
      .sort((left, right) => {
        const dateDifference = dayjs(left.dateValue).valueOf() - dayjs(right.dateValue).valueOf();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        if (left.entryType === right.entryType) {
          return left.key.localeCompare(right.key);
        }

        return left.entryType === "bill" ? -1 : 1;
      });

    let runningBalance = 0;

    const normalizedRows = rows.map((row) => {
      runningBalance += row.billAmount;
      runningBalance -= row.paymentAmount;

      return {
        ...row,
        dateLabel: formatDate(row.dateValue),
        balance: runningBalance,
      };
    });

    return normalizedRows.sort((left, right) => {
      const dateDifference = dayjs(right.dateValue).valueOf() - dayjs(left.dateValue).valueOf();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      if (left.entryType === right.entryType) {
        return right.key.localeCompare(left.key);
      }

      return left.entryType === "bill" ? -1 : 1;
    });
  }, [bills, payments]);

  const totalBillAmount = useMemo(
    () => bills.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
    [bills],
  );
  const totalPaymentAmount = useMemo(
    () => payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payments],
  );
  const closingBalance = totalBillAmount - totalPaymentAmount;

  const handleDownloadPdf = () => {
    if (!selectedDealer || !dateRange?.[0] || !dateRange?.[1]) {
      message.warning("Select date range and dealer first");
      return;
    }

    const dateRangeLabel = `${dateRange[0].format("DD-MM-YYYY")} to ${dateRange[1].format("DD-MM-YYYY")}`;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 34;
    let cursorY = 36;

    doc.setFillColor(240, 249, 247);
    doc.setDrawColor(214, 233, 229);
    doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 92, 14, 14, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 77, 64);
    doc.text("Dealer Statement", marginX + 18, cursorY + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dealer: ${selectedDealer.dealerName}`, marginX + 18, cursorY + 50);
    doc.text(`Contact: ${selectedDealer.contactNo || "-"}`, marginX + 18, cursorY + 66);
    doc.text(`City: ${selectedDealer.city || "-"}`, marginX + 18, cursorY + 82);
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - marginX - 18, cursorY + 50, { align: "right" });

    cursorY += 112;

    const summaryCards = [
      {
        label: "Total Bills",
        value: formatAmount(totalBillAmount),
        fill: [236, 253, 245] as [number, number, number],
        border: [187, 247, 208] as [number, number, number],
        text: [4, 120, 87] as [number, number, number],
      },
      {
        label: "Total Payments",
        value: formatAmount(totalPaymentAmount),
        fill: [239, 246, 255] as [number, number, number],
        border: [191, 219, 254] as [number, number, number],
        text: [29, 78, 216] as [number, number, number],
      },
      {
        label: "Closing Balance",
        value: formatAmount(closingBalance),
        fill:
          closingBalance > 0
            ? ([255, 247, 237] as [number, number, number])
            : ([236, 253, 245] as [number, number, number]),
        border:
          closingBalance > 0
            ? ([254, 215, 170] as [number, number, number])
            : ([187, 247, 208] as [number, number, number]),
        text:
          closingBalance > 0
            ? ([194, 65, 12] as [number, number, number])
            : ([4, 120, 87] as [number, number, number]),
      },
    ];

    const cardGap = 12;
    const cardWidth = (pageWidth - marginX * 2 - cardGap * 2) / 3;

    summaryCards.forEach((card, index) => {
      const x = marginX + index * (cardWidth + cardGap);
      doc.setFillColor(...card.fill);
      doc.setDrawColor(...card.border);
      doc.roundedRect(x, cursorY, cardWidth, 54, 12, 12, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, x + 14, cursorY + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...card.text);
      doc.text(card.value, x + 14, cursorY + 38);
    });

    cursorY += 72;

    const bodyRows = statementRows.length
      ? statementRows.map((row) => [
          row.dateLabel,
          [
            row.entryType === "bill" ? "Bill" : "Payment",
            row.paymentType ? `Type: ${String(row.paymentType).toUpperCase()}` : "",
            row.product,
          ]
            .filter(Boolean)
            .join("\n"),
          row.billAmount > 0 ? formatAmount(row.billAmount) : "-",
          row.paymentAmount > 0 ? formatAmount(row.paymentAmount) : "-",
          formatAmount(row.balance),
        ])
      : [["-", "No statement entries found for this range", "-", "-", "-"]];

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 28 },
      head: [["Date", "Product / Entry", "Bill Amount", "Payment Amount", "Balance"]],
      body: bodyRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: { top: 10, right: 10, bottom: 10, left: 10 },
        lineColor: [226, 232, 240],
        lineWidth: 0.8,
        textColor: [15, 23, 42],
        valign: "top",
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        lineColor: [203, 213, 225],
      },
      alternateRowStyles: {
        fillColor: [250, 252, 251],
      },
      columnStyles: {
        0: { cellWidth: 82, fontStyle: "bold" },
        1: { cellWidth: 215 },
        2: { cellWidth: 85, halign: "right" },
        3: { cellWidth: 95, halign: "right" },
        4: { cellWidth: 82, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (hookData) => {
        if (hookData.section !== "body") return;

        const row = statementRows[hookData.row.index];
        if (!row) return;

        if (hookData.column.index === 1) {
          hookData.cell.styles.textColor = row.entryType === "bill" ? [4, 120, 87] : [29, 78, 216];
        }

        if (hookData.column.index === 2 && row.billAmount > 0) {
          hookData.cell.styles.textColor = [4, 120, 87];
          hookData.cell.styles.fontStyle = "bold";
        }

        if (hookData.column.index === 3 && row.paymentAmount > 0) {
          hookData.cell.styles.textColor = [29, 78, 216];
          hookData.cell.styles.fontStyle = "bold";
        }

        if (hookData.column.index === 4) {
          hookData.cell.styles.textColor = row.balance > 0 ? [194, 65, 12] : [4, 120, 87];
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save(
      `dealer-statement-${selectedDealer.dealerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${dateRange[0].format("DD-MM-YYYY")}-to-${dateRange[1].format("DD-MM-YYYY")}.pdf`,
    );
  };

  const columns: ColumnsType<StatementRow> = [
    {
      title: "Date",
      dataIndex: "dateLabel",
      key: "dateLabel",
      width: 140,
      render: (value: string) => <Text strong style={{ color: "#0f172a" }}>{value}</Text>,
    },
    {
      title: "Product / Entry",
      dataIndex: "product",
      key: "product",
      width: 380,
      render: (_, record) => (
        <div style={{ display: "grid", gap: 4 }}>
          <Space size={8} wrap>
            <Tag
              color={record.entryType === "bill" ? "green" : "blue"}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {record.entryType === "bill" ? "Bill" : "Payment"}
            </Tag>
            {record.paymentType ? (
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  color: getPaymentTypeTone(record.paymentType).color,
                  background: getPaymentTypeTone(record.paymentType).background,
                }}
              >
                {record.paymentType}
              </span>
            ) : null}
          </Space>
          <Text style={{ color: "#334155" }}>{record.product}</Text>
        </div>
      ),
    },
    {
      title: "Bill Amount",
      dataIndex: "billAmount",
      key: "billAmount",
      width: 160,
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <Text strong style={{ color: "#047857" }}>
            {formatAmount(value)}
          </Text>
        ) : (
          <Text style={{ color: "#94a3b8" }}>-</Text>
        ),
    },
    {
      title: "Payment Amount",
      dataIndex: "paymentAmount",
      key: "paymentAmount",
      width: 170,
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <Text strong style={{ color: "#1d4ed8" }}>
            {formatAmount(value)}
          </Text>
        ) : (
          <Text style={{ color: "#94a3b8" }}>-</Text>
        ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 170,
      align: "right",
      render: (value: number) => (
        <Text
          strong
          style={{
            color: Number(value || 0) > 0 ? "#b45309" : "#047857",
          }}
        >
          {formatAmount(value)}
        </Text>
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
          overflow: "hidden",
        }}
        bodyStyle={{ position: "relative", padding: 24 }}
      >
        <Button
          size="large"
          onClick={handleDownloadPdf}
          disabled={!selectedDealerId || !dateRange?.[0] || !dateRange?.[1] || loading}
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 2,
            borderRadius: 12,
            height: 40,
            paddingInline: 18,
            border: "none",
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            color: "#ffffff",
            fontWeight: 700,
            boxShadow: "0 10px 20px rgba(0, 105, 92, 0.18)",
          }}
        >
          Download PDF
        </Button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
            paddingRight: 160,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <Title level={3} style={{ margin: 0, color: THEME.dark }}>
              Dealer Statement
            </Title>
            <Text style={{ color: "#64748b" }}>
              Select date range first, then choose dealer to view date-wise bill and payment statement.
            </Text>
          </div>

          <Space wrap size={12} align="start">
            <RangePicker
              size="large"
              value={dateRange}
              onChange={setDateRange}
              format="DD-MM-YYYY"
              allowClear
              style={{ minWidth: 280 }}
            />
            <Select
              size="large"
              showSearch
              allowClear
              loading={dealerLoading}
              placeholder={dateRange?.[0] && dateRange?.[1] ? "Select dealer" : "Select date range first"}
              value={selectedDealerId}
              onChange={setSelectedDealerId}
              optionFilterProp="label"
              disabled={!dateRange?.[0] || !dateRange?.[1]}
              options={dealerOptions}
              style={{ minWidth: 280 }}
            />
          </Space>
        </div>

        {selectedDealer ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1.2fr) repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(0, 105, 92, 0.1) 0%, rgba(224, 247, 246, 0.95) 55%, rgba(255, 255, 255, 0.98) 100%)",
                border: "1px solid rgba(0, 105, 92, 0.12)",
              }}
            >
              <Text
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: "#0f766e",
                }}
              >
                Selected Dealer
              </Text>
              <Title level={4} style={{ margin: "6px 0 0", color: "#0f172a" }}>
                {selectedDealer.dealerName}
              </Title>
              <Text style={{ color: "#475569" }}>
                {selectedDealer.contactNo || "-"}{selectedDealer.city ? `  |  ${selectedDealer.city}` : ""}
              </Text>
            </div>

            <div
              style={{
                padding: "16px 18px",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(0, 105, 92, 0.12)",
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 12 }}>Total Bills</Text>
              <Title level={4} style={{ margin: "8px 0 0", color: "#047857" }}>
                {formatAmount(totalBillAmount)}
              </Title>
            </div>

            <div
              style={{
                padding: "16px 18px",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(0, 105, 92, 0.12)",
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 12 }}>Total Payments</Text>
              <Title level={4} style={{ margin: "8px 0 0", color: "#1d4ed8" }}>
                {formatAmount(totalPaymentAmount)}
              </Title>
            </div>

            <div
              style={{
                padding: "16px 18px",
                borderRadius: 18,
                background:
                  Number(closingBalance || 0) > 0
                    ? "linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(255, 255, 255, 0.96) 100%)"
                    : "linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(255, 255, 255, 0.96) 100%)",
                border:
                  Number(closingBalance || 0) > 0
                    ? "1px solid rgba(217, 119, 6, 0.18)"
                    : "1px solid rgba(5, 150, 105, 0.18)",
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 12 }}>Closing Balance</Text>
              <Title
                level={4}
                style={{
                  margin: "8px 0 0",
                  color: Number(closingBalance || 0) > 0 ? "#b45309" : "#047857",
                }}
              >
                {formatAmount(closingBalance)}
              </Title>
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        ) : null}

        {!dateRange?.[0] || !dateRange?.[1] ? (
          <div
            style={{
              minHeight: 360,
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              border: "1px dashed rgba(148, 163, 184, 0.35)",
              background: "rgba(248, 250, 252, 0.86)",
            }}
          >
            <Empty description="Select date range to start statement" />
          </div>
        ) : !selectedDealerId ? (
          <div
            style={{
              minHeight: 360,
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              border: "1px dashed rgba(148, 163, 184, 0.35)",
              background: "rgba(248, 250, 252, 0.86)",
            }}
          >
            <Empty description="Select dealer to view statement" />
          </div>
        ) : loading ? (
          <div style={{ minHeight: 360, display: "grid", placeItems: "center" }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            rowKey="key"
            columns={columns}
            dataSource={statementRows}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No statement entries found for this range"
                />
              ),
            }}
            scroll={{ x: 980, y: 520 }}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>
    </div>
  );
};

export default DealerStatementPage;
