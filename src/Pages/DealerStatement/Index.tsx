import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import jsPDF from "jspdf";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Table,
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
  productId?: string | { _id?: string; mrp?: number } | null;
  productName?: string;
  mrp?: number;
  productRate?: number;
  amount?: number;
  quantity?: number;
  total?: number;
};

type DealerBillRecord = {
  _id: string;
  billDate?: string;
  kattaCount?: number;
  totalAmount?: number;
  items?: DealerBillLineItem[];
  dealerId?: {
    _id?: string;
    dealerName?: string;
    contactNo?: string;
    city?: string;
    margin?: number;
  };
  userId?: {
    name?: string;
    email?: string;
  };
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
  sourceBill?: DealerBillRecord;
};

const formatAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPdfAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatRoundedAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

const formatRoundedPdfAmount = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : "-";
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

const getPaymentLabel = (paymentType?: string) => {
  const normalized = String(paymentType || "").trim().toLowerCase();

  if (normalized === "online") return "Online Payment Received";
  if (normalized === "bank") return "Bank Payment Received";
  if (normalized === "cash") return "Cash Payment Received";

  return "Payment Received";
};

const resolveLineAmount = (amount?: number, rate?: number, margin?: number) => {
  const normalizedAmount = Number(amount);

  if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
    return normalizedAmount;
  }

  const normalizedRate = Number(rate || 0);
  const normalizedMargin = Number(margin || 0);
  const divisor = 100 + normalizedMargin;

  if (!Number.isFinite(normalizedRate) || !Number.isFinite(normalizedMargin) || divisor <= 0) {
    return 0;
  }

  return (normalizedRate * 100) / divisor;
};

const resolveCustomAmount = (amount?: number, productRate?: number) => {
  const normalizedAmount = Number(amount);

  if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
    return normalizedAmount;
  }

  const normalizedRate = Number(productRate);
  return Number.isFinite(normalizedRate) && normalizedRate >= 0 ? normalizedRate : 0;
};

const getDealerBillSequence = (
  records: DealerBillRecord[],
  record: DealerBillRecord,
) => records.findIndex((item) => item._id === record._id) + 1;

const DealerStatementPage: React.FC = () => {
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>();
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [loading, setLoading] = useState(false);
  const [dealerLoading, setDealerLoading] = useState(true);
  const [error, setError] = useState("");
  const [bills, setBills] = useState<DealerBillRecord[]>([]);
  const [payments, setPayments] = useState<DealerPaymentRecord[]>([]);
  const [activeBill, setActiveBill] = useState<DealerBillRecord | null>(null);

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
            status: "shipped",
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
        sourceBill: bill,
      })),
      ...payments.map((payment) => ({
        key: `payment-${payment._id}`,
        dateValue: payment.paymentDate || "",
        entryType: "payment" as const,
        product: getPaymentLabel(payment.paymentType),
        billAmount: 0,
        paymentAmount: Number(payment.amount || 0),
        paymentType: payment.paymentType,
        sourceBill: undefined,
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

  const orderedActiveBillItems = useMemo(() => {
    if (!activeBill?.items?.length) {
      return [];
    }

    return [...activeBill.items];
  }, [activeBill]);

  const handleDownloadPdf = () => {
    if (!selectedDealer || !dateRange?.[0] || !dateRange?.[1]) {
      message.warning("Select date range and dealer first");
      return;
    }

    const dateRangeLabel = `${dateRange[0].format("DD-MM-YYYY")} TO ${dateRange[1].format("DD-MM-YYYY")}`;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const marginTop = 12;
    const contentWidth = pageWidth - marginX * 2;
    const orderedBillsForPdf = [...bills]
      .filter((bill) => dayjs(bill.billDate).isValid())
      .sort((left, right) => {
        const dateDifference = dayjs(left.billDate).valueOf() - dayjs(right.billDate).valueOf();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return getDealerBillSequence(bills, left) - getDealerBillSequence(bills, right);
      });
    const statementRowsForPdf = [
      ...bills.map((bill) => ({
        dateValue: bill.billDate || "",
        dateLabel: formatDate(bill.billDate),
        billNo: String(getDealerBillSequence(bills, bill)),
        billAmount: Number(bill.totalAmount || 0),
        receivedAmount: 0,
      })),
      ...payments.map((payment) => ({
        dateValue: payment.paymentDate || "",
        dateLabel: formatDate(payment.paymentDate),
        billNo: "",
        billAmount: 0,
        receivedAmount: Number(payment.amount || 0),
      })),
    ]
      .filter((item) => dayjs(item.dateValue).isValid())
      .sort((left, right) => dayjs(left.dateValue).valueOf() - dayjs(right.dateValue).valueOf());

    const borderColor: [number, number, number] = [0, 0, 0];
    const rowHeight = 18;
    const blockGapX = 10;
    const blockGapY = 12;
    const blockWidth = (contentWidth - blockGapX) / 2;
    const blockInnerWidths = {
      mrp: blockWidth * 0.18,
      product: blockWidth * 0.38,
      qty: blockWidth * 0.1,
      rate: blockWidth * 0.15,
      amt: blockWidth * 0.19,
    };
    const summaryWidths = {
      date: contentWidth * 0.24,
      bill: contentWidth * 0.35,
      received: contentWidth * 0.41,
    };

    const getCellTextMetrics = (
      value: string,
      width: number,
      fontSize: number,
      bold?: boolean,
      minFontSize = 5.2,
    ) => {
      const normalized = String(value || "");
      doc.setFont("helvetica", bold ? "bold" : "normal");
      let adjustedFontSize = fontSize;
      doc.setFontSize(adjustedFontSize);

      while (adjustedFontSize > minFontSize && doc.getTextWidth(normalized) > width) {
        adjustedFontSize -= 0.2;
        doc.setFontSize(adjustedFontSize);
      }

      return {
        text: normalized,
        fontSize: adjustedFontSize,
      };
    };

    const drawCell = (
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      options?: {
        align?: "left" | "center" | "right";
        bold?: boolean;
        textColor?: [number, number, number];
        fillColor?: [number, number, number];
        fontSize?: number;
        minFontSize?: number;
      },
    ) => {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.8);
      if (options?.fillColor) {
        doc.setFillColor(...options.fillColor);
        doc.rect(x, y, width, height, "FD");
      } else {
        doc.rect(x, y, width, height);
      }

      doc.setFont("helvetica", options?.bold ? "bold" : "normal");
      doc.setTextColor(...(options?.textColor || borderColor));
      const textMetrics = getCellTextMetrics(
        String(text || ""),
        Math.max(width - 10, 4),
        options?.fontSize || 8.4,
        options?.bold,
        options?.minFontSize,
      );
      doc.setFontSize(textMetrics.fontSize);

      const align = options?.align || "center";
      const textX =
        align === "left"
          ? x + 5
          : align === "right"
            ? x + width - 5
            : x + width / 2;

      doc.text(textMetrics.text, textX, y + height / 2 + 3, {
        align,
      });
    };

    const getBillBlockHeight = (bill: DealerBillRecord) => {
      const itemsCount = Math.max(bill.items?.length || 0, 1);
      return rowHeight * (itemsCount + 3);
    };

    const drawFirstPageHeader = () => {
      const startX = marginX + 8;
      const tableWidth = contentWidth - 16;
      let cursorY = marginTop + 8;

      drawCell(startX, cursorY, tableWidth, rowHeight + 2, selectedDealer.dealerName || "-", {
        fontSize: 9.4,
      });
      cursorY += rowHeight + 2;

      drawCell(startX, cursorY, tableWidth, rowHeight + 2, dateRangeLabel, {
        fontSize: 9.4,
      });
    };

    const drawBillBlock = (bill: DealerBillRecord, x: number, y: number) => {
      let cursorY = y;
      const items = (bill.items?.length
        ? bill.items
        : [{ productName: "-", quantity: 0, amount: 0, total: 0 } as DealerBillLineItem]
      );

      const topLabelWidth = blockWidth * 0.26;
      const topValueWidth = blockWidth * 0.34;
      const topLabelWidthRight = blockWidth * 0.22;
      const topValueWidthRight = blockWidth - topLabelWidth - topValueWidth - topLabelWidthRight;

      drawCell(x, cursorY, topLabelWidth, rowHeight, "DATE", { bold: false, fontSize: 8.1 });
      drawCell(x + topLabelWidth, cursorY, topValueWidth, rowHeight, formatDate(bill.billDate), {
        bold: true,
        fontSize: 8.1,
      });
      drawCell(x + topLabelWidth + topValueWidth, cursorY, topLabelWidthRight, rowHeight, "KATTA", {
        fontSize: 8.1,
      });
      drawCell(x + topLabelWidth + topValueWidth + topLabelWidthRight, cursorY, topValueWidthRight, rowHeight, String(bill.kattaCount ?? "-"), {
        bold: true,
        fontSize: 8.1,
      });

      cursorY += rowHeight + 3;

      drawCell(x, cursorY, blockInnerWidths.mrp, rowHeight, "MRP", { fontSize: 8.1 });
      drawCell(x + blockInnerWidths.mrp, cursorY, blockInnerWidths.product, rowHeight, "PRODUCT", { fontSize: 8.1 });
      drawCell(x + blockInnerWidths.mrp + blockInnerWidths.product, cursorY, blockInnerWidths.qty, rowHeight, "QTY", { fontSize: 8.1 });
      drawCell(
        x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty,
        cursorY,
        blockInnerWidths.rate,
        rowHeight,
        "RATE",
        { fontSize: 8.1 },
      );
      drawCell(
        x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty + blockInnerWidths.rate,
        cursorY,
        blockInnerWidths.amt,
        rowHeight,
        "AMT",
        { fontSize: 8.1 },
      );

      cursorY += rowHeight;

      items.forEach((item) => {
        const itemProductId =
          typeof item.productId === "object"
            ? item.productId?._id
            : item.productId;
        const rate = itemProductId
          ? resolveLineAmount(item.amount, item.productRate, bill.dealerId?.margin)
          : resolveCustomAmount(item.amount, item.productRate);
        const total = item.total ?? Number(item.quantity || 0) * rate;
        const productName = item.productName || "-";

        drawCell(x, cursorY, blockInnerWidths.mrp, rowHeight, formatPdfAmount(
          item.mrp || (typeof item.productId === "object" ? item.productId?.mrp : 0),
        ), { align: "right", fontSize: 7.9, minFontSize: 7.2 });
        drawCell(x + blockInnerWidths.mrp, cursorY, blockInnerWidths.product, rowHeight, productName, {
          fontSize: 7.8,
          minFontSize: 6.9,
        });
        drawCell(
          x + blockInnerWidths.mrp + blockInnerWidths.product,
          cursorY,
          blockInnerWidths.qty,
          rowHeight,
          String(Number(item.quantity || 0)),
          { align: "right", fontSize: 7.9, minFontSize: 7.2 },
        );
        drawCell(
          x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty,
          cursorY,
          blockInnerWidths.rate,
          rowHeight,
          formatPdfAmount(rate),
          { align: "right", fontSize: 7.8, minFontSize: 7.1 },
        );
        drawCell(
          x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty + blockInnerWidths.rate,
          cursorY,
          blockInnerWidths.amt,
          rowHeight,
          formatPdfAmount(total),
          { align: "right", fontSize: 8, minFontSize: 7.3 },
        );
        cursorY += rowHeight;
      });

      drawCell(
        x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty,
        cursorY,
        blockInnerWidths.rate,
        rowHeight,
        "TOTAL",
        { fontSize: 8.4, minFontSize: 7.6 },
      );
      drawCell(
        x + blockInnerWidths.mrp + blockInnerWidths.product + blockInnerWidths.qty + blockInnerWidths.rate,
        cursorY,
        blockInnerWidths.amt,
        rowHeight,
        formatRoundedPdfAmount(bill.totalAmount),
        { bold: true, align: "right", fontSize: 8.4, minFontSize: 7.6 },
      );
    };

    const drawSummaryTable = () => {
      const startX = marginX + 8;
      let cursorY = marginTop + 8;
      const tableWidth = contentWidth - 16;
      const firstColumn = summaryWidths.date;
      const secondColumn = summaryWidths.bill;
      const thirdColumn = tableWidth - firstColumn - secondColumn;

      drawCell(startX, cursorY, firstColumn, rowHeight + 4, "DATE", { fontSize: 9 });
      drawCell(startX + firstColumn, cursorY, secondColumn, rowHeight + 4, "BILL AMOUNT", { fontSize: 9 });
      drawCell(startX + firstColumn + secondColumn, cursorY, thirdColumn, rowHeight + 4, "RECEIVED AMOUNT", { fontSize: 9 });

      cursorY += rowHeight + 8;

      bodyRows.forEach((row) => {
        drawCell(startX, cursorY, firstColumn, rowHeight, String(row[0] || "-"), { align: "left", fontSize: 8.6 });
        drawCell(startX + firstColumn, cursorY, secondColumn, rowHeight, String(row[2] || "-"), { fontSize: 8.6 });
        drawCell(startX + firstColumn + secondColumn, cursorY, thirdColumn, rowHeight, String(row[3] || "-"), { fontSize: 8.6 });
        cursorY += rowHeight;
      });

      drawCell(startX, cursorY + 8, firstColumn, rowHeight, "", { fontSize: 8.6 });
      drawCell(startX + firstColumn, cursorY + 8, secondColumn, rowHeight, formatPdfAmount(totalBillAmount), { fontSize: 8.6 });
      drawCell(startX + firstColumn + secondColumn, cursorY + 8, thirdColumn, rowHeight, formatPdfAmount(totalPaymentAmount), { fontSize: 8.6 });

      cursorY += rowHeight + 32;

      drawCell(startX, cursorY, firstColumn + secondColumn, rowHeight + 2, "PENDING PAYMENT", { fontSize: 9 });
      drawCell(startX + firstColumn + secondColumn, cursorY, thirdColumn, rowHeight + 2, formatPdfAmount(closingBalance), {
        fontSize: 9,
        textColor: [220, 38, 38],
      });
    };

    const bodyRows = statementRowsForPdf.length
      ? statementRowsForPdf.map((row) => [
          row.dateLabel,
          row.billNo,
          row.billAmount > 0 ? formatPdfAmount(row.billAmount) : "",
          row.receivedAmount > 0 ? formatPdfAmount(row.receivedAmount) : "",
        ])
      : [["-", "-", "-", "-"]];

    if (orderedBillsForPdf.length) {
      let currentY = marginTop + rowHeight * 2 + 20;
      drawFirstPageHeader();
      orderedBillsForPdf.forEach((bill, index) => {
        const isLeft = index % 2 === 0;
        const x = isLeft ? marginX : marginX + blockWidth + blockGapX;
        const blockHeight = getBillBlockHeight(bill);

        if (isLeft && index > 0) {
          const pairHeight = Math.max(
            blockHeight,
            orderedBillsForPdf[index + 1] ? getBillBlockHeight(orderedBillsForPdf[index + 1]) : 0,
          );

          if (currentY + pairHeight > pageHeight - 26) {
            doc.addPage();
            currentY = marginTop;
          }
        }

        drawBillBlock(bill, x, currentY);

        if (!isLeft) {
          currentY += Math.max(blockHeight, getBillBlockHeight(orderedBillsForPdf[index - 1])) + blockGapY;
        } else if (index === orderedBillsForPdf.length - 1) {
          currentY += blockHeight + blockGapY;
        }
      });

      if (doc.getCurrentPageInfo().pageNumber >= 1) {
        doc.addPage();
      }
    } else {
      drawCell(marginX, marginTop, contentWidth, rowHeight + 4, "NO BILL DETAILS FOUND", { fontSize: 9 });
      doc.addPage();
    }

    drawSummaryTable();

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${page}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    }

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
          {record.entryType === "payment" ? (
            <Text style={{ color: "#334155" }}>{record.product}</Text>
          ) : null}
          {record.entryType === "bill" && record.sourceBill ? (
            <Button
              type="link"
              size="small"
              onClick={() => setActiveBill(record.sourceBill || null)}
              style={{ padding: 0, justifyContent: "flex-start", width: "fit-content" }}
            >
              View Bill
            </Button>
          ) : null}
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
        bodyStyle={{ position: "relative", padding: 18 }}
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
            marginBottom: 12,
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
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
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
                padding: "12px 14px",
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
                padding: "12px 14px",
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
                padding: "12px 14px",
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
              <Text style={{ color: "#64748b", fontSize: 12 }}>Pending Payment</Text>
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
            scroll={{ x: 980, y: "calc(100vh - 410px)" }}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      <Modal
        open={Boolean(activeBill)}
        onCancel={() => setActiveBill(null)}
        footer={null}
        width={980}
        title="Dealer Bill Details"
      >
        {activeBill ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div
              style={{
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 16,
                padding: 18,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
                  paddingBottom: 14,
                }}
              >
                <div>
                  <Text type="secondary">Bill No</Text>
                  <div>
                    <Text strong style={{ fontSize: 18 }}>
                      {getDealerBillSequence(bills, activeBill) || "-"}
                    </Text>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Text type="secondary">Bill Date</Text>
                  <div>
                    <Text strong>{formatDate(activeBill.billDate)}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <Text strong>Dealer Name : </Text>
                    <Text>{activeBill.dealerId?.dealerName || selectedDealer?.dealerName || "-"}</Text>
                    <Text style={{ marginLeft: 8 }}>
                      - {activeBill.dealerId?.contactNo || selectedDealer?.contactNo || "-"}
                    </Text>
                  </div>
                  <div>
                    <Text strong>City : </Text>
                    <Text>{activeBill.dealerId?.city || selectedDealer?.city || "-"}</Text>
                  </div>
                  <div>
                    <Text strong>Margin : </Text>
                    <Text>{Number(activeBill.dealerId?.margin || 0)}%</Text>
                  </div>
                  <div>
                    <Text strong>Created By : </Text>
                    <Text>{activeBill.userId?.name || activeBill.userId?.email || "-"}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Table
                  rowKey={(record, index) =>
                    (typeof record.productId === "object"
                      ? record.productId?._id
                      : record.productId) || `custom-${index}`
                  }
                  dataSource={orderedActiveBillItems}
                  pagination={false}
                  locale={{ emptyText: "No bill items found" }}
                  scroll={{ x: "max-content" }}
                  columns={[
                    {
                      title: "#",
                      key: "sequence",
                      width: 70,
                      align: "center",
                      render: (_, __, index) => index + 1,
                    },
                    {
                      title: "MRP",
                      key: "mrp",
                      width: 130,
                      render: (_, record) =>
                        formatAmount(
                          record.mrp ||
                            (typeof record.productId === "object"
                              ? record.productId?.mrp
                              : 0),
                        ),
                    },
                    {
                      title: "Product",
                      key: "productName",
                      render: (_, record) => record.productName || "-",
                    },
                    {
                      title: "Qty",
                      dataIndex: "quantity",
                      key: "quantity",
                      render: (value) => value ?? 0,
                      width: 110,
                    },
                    {
                      title: "Amount",
                      key: "amount",
                      render: (_, record) => {
                        const itemProductId =
                          typeof record.productId === "object"
                            ? record.productId?._id
                            : record.productId;
                        const amount = itemProductId
                          ? resolveLineAmount(
                              record.amount,
                              record.productRate,
                              activeBill.dealerId?.margin,
                            )
                          : resolveCustomAmount(record.amount, record.productRate);

                        return formatAmount(amount);
                      },
                      width: 130,
                    },
                    {
                      title: "Total",
                      key: "total",
                      render: (_, record) => {
                        const itemProductId =
                          typeof record.productId === "object"
                            ? record.productId?._id
                            : record.productId;
                        const amount = itemProductId
                          ? resolveLineAmount(
                              record.amount,
                              record.productRate,
                              activeBill.dealerId?.margin,
                            )
                          : resolveCustomAmount(record.amount, record.productRate);

                        return formatAmount(
                          record.total ?? Number(record.quantity || 0) * amount,
                        );
                      },
                      width: 160,
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(185, 28, 28, 0.15)",
                    background: "rgba(185, 28, 28, 0.05)",
                  }}
                >
                  <Text strong>Katta : {activeBill.kattaCount ?? "-"}</Text>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 105, 92, 0.15)",
                    background: "rgba(0, 105, 92, 0.06)",
                  }}
                >
                  <Text strong>
                    Total Amount : {formatRoundedAmount(activeBill.totalAmount)}
                  </Text>
                </div>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default DealerStatementPage;
