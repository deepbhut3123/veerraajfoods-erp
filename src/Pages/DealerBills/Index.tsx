import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import html2canvas from "html2canvas";
import {
  Alert,
  Button,
  Card,
  DatePicker,
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
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  addDealerBill,
  deleteDealerBill,
  getAllDealerBills,
  getAllDealers,
  getAllDealerProducts,
  getAllProducts,
  updateDealerBill,
} from "../../Utils/Api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const THEME = {
  dark: "#004D40",
  mid: "#00695C",
};

type DealerOption = {
  _id: string;
  dealerName: string;
  contactNo: string;
  city: string;
  margin?: number;
};

type DealerProductOption = {
  _id: string;
  mrp: number;
  productName: string;
  productNameGujarati?: string;
  productRate: number;
  sequence?: number;
};

type StockProductOption = {
  _id: string;
  mrp: number;
  productName: string;
  productNameGujarati?: string;
  productRate: number;
  currentStock?: number;
};

type DealerBillLineItem = {
  productId?: string | DealerProductOption | null;
  stockProductId?: string | StockProductOption | null;
  mrp?: number;
  productName?: string;
  productRate?: number;
  amount?: number;
  quantity?: number;
  total?: number;
};

type DealerBillRecord = {
  _id: string;
  billDate: string;
  kattaCount: number;
  totalAmount: number;
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

type DealerBillMasterItem = {
  productId?: string;
  productName?: string;
  mrp?: number;
  productRate?: number;
  amount?: number;
  quantity?: number;
};

type DealerBillCustomItem = {
  productName?: string;
  mrp?: number;
  productRate?: number;
  amount?: number;
  quantity?: number;
};

type DealerBillFormValues = {
  dealerId: string;
  billDate: Dayjs;
  kattaCount?: number;
  items: DealerBillMasterItem[];
  customItems: DealerBillCustomItem[];
};

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

const EMPTY_MASTER_ITEMS: DealerBillMasterItem[] = [];
const EMPTY_CUSTOM_ITEMS: DealerBillCustomItem[] = [];
const EXPORT_FOOTER_LINES = [
  "માલ મળે ત્યારે માલ બિલ મુજબ ચેક કરી ને જ લેવો.",
  "માલ માં કઈ પણ ફેરફાર હોય તો ઓફિસ નંબર (90994 00116) માં જાણ કરવી.",
];

const roundToTwo = (value?: number) => {
  const normalizedValue = Number(value || 0);
  return Number.isFinite(normalizedValue)
    ? Math.round((normalizedValue + Number.EPSILON) * 100) / 100
    : 0;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundToTwo(value));

const formatRoundedCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : "-";
};

const formatExportDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D-M-YYYY") : "-";
};

const createEmptyCustomItem = (): DealerBillCustomItem => ({
  productName: "",
  amount: undefined,
  quantity: undefined,
});

const getDealerProductSequence = (product?: DealerProductOption | null) => {
  const normalizedSequence = Number(product?.sequence);
  return Number.isFinite(normalizedSequence) && normalizedSequence > 0
    ? normalizedSequence
    : Number.MAX_SAFE_INTEGER;
};

const sortDealerProductsBySequence = (items: DealerProductOption[]) =>
  [...items].sort((left, right) => {
    const sequenceDifference =
      getDealerProductSequence(left) - getDealerProductSequence(right);

    if (sequenceDifference !== 0) {
      return sequenceDifference;
    }

    return left.productName.localeCompare(right.productName);
  });

const getDealerBillSequence = (
  records: DealerBillRecord[],
  record: DealerBillRecord,
) => records.findIndex((item) => item._id === record._id) + 1;

const calculateAmountFromMargin = (rate?: number, margin?: number) => {
  const normalizedRate = Number(rate || 0);
  const normalizedMargin = Number(margin || 0);
  const divisor = 100 + normalizedMargin;

  if (!Number.isFinite(normalizedRate) || !Number.isFinite(normalizedMargin) || divisor <= 0) {
    return 0;
  }

  return (normalizedRate * 100) / divisor;
};

const resolveLineAmount = (amount?: number, rate?: number, margin?: number) => {
  const normalizedAmount = Number(amount);

  if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
    return normalizedAmount;
  }

  return calculateAmountFromMargin(rate, margin);
};

const resolveCustomAmount = (amount?: number, productRate?: number) => {
  const normalizedAmount = Number(amount);

  if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
    return normalizedAmount;
  }

  const normalizedRate = Number(productRate);
  return Number.isFinite(normalizedRate) && normalizedRate >= 0 ? normalizedRate : 0;
};

const normalizeProductName = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getProductLabel = (product?: { productName?: string; productNameGujarati?: string }) =>
  [product?.productName, product?.productNameGujarati].filter(Boolean).join(" / ") || "-";

const resolveStockProduct = (
  productName: string | undefined,
  mrp: number | undefined,
  stockProducts: StockProductOption[],
) => {
  const normalizedName = normalizeProductName(productName);
  const candidates = stockProducts.filter(
    (product) => normalizeProductName(product.productName) === normalizedName,
  );

  if (!candidates.length) {
    return {
      product: null,
      reason: "missing" as const,
    };
  }

  if (candidates.length === 1) {
    return {
      product: candidates[0],
      reason: null,
    };
  }

  const normalizedMrp = Number(mrp || 0);
  const exactMrpMatches = candidates.filter(
    (candidate) => Number(candidate.mrp || 0) === normalizedMrp,
  );

  if (exactMrpMatches.length === 1) {
    return {
      product: exactMrpMatches[0],
      reason: null,
    };
  }

  return {
    product: null,
    reason: "ambiguous" as const,
  };
};

const DealerBillsPage: React.FC = () => {
  const [data, setData] = useState<DealerBillRecord[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [products, setProducts] = useState<DealerProductOption[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [editingItem, setEditingItem] = useState<DealerBillRecord | null>(null);
  const [activeBill, setActiveBill] = useState<DealerBillRecord | null>(null);
  const [exportBill, setExportBill] = useState<DealerBillRecord | null>(null);
  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const [form] = Form.useForm<DealerBillFormValues>();
  const watchedItems = Form.useWatch("items", form) ?? EMPTY_MASTER_ITEMS;
  const watchedCustomItems = Form.useWatch("customItems", form) ?? EMPTY_CUSTOM_ITEMS;
  const selectedDealerId = Form.useWatch("dealerId", form);
  const orderedProducts = useMemo(() => sortDealerProductsBySequence(products), [products]);

  const loadBills = async (search = "", range: DateRangeValue = null) => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealerBills({
        search: search.trim() || undefined,
        fromDate: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
        toDate: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
      });
      setData(response?.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dealer bills",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [dealerRes, productRes, stockProductRes] = await Promise.all([
          getAllDealers(),
          getAllDealerProducts(),
          getAllProducts(),
        ]);
        setDealers(dealerRes?.data || []);
        setProducts(sortDealerProductsBySequence(productRes?.data || []));
        setStockProducts(stockProductRes?.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load dealer bill form data",
        );
      }
    };

    void loadStaticData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBills(searchText, dateRange);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [dateRange, searchText]);

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer._id === selectedDealerId),
    [dealers, selectedDealerId],
  );

  const editingStockRestoreMap = useMemo(() => {
    const quantityMap = new Map<string, number>();

    (editingItem?.items || []).forEach((item) => {
      const directStockProductId =
        typeof item.stockProductId === "object"
          ? item.stockProductId?._id
          : item.stockProductId;
      const stockResolution = directStockProductId
        ? {
            product: stockProducts.find((stockProduct) => stockProduct._id === directStockProductId) || null,
          }
        : resolveStockProduct(item.productName, item.mrp, stockProducts);
      const stockProductId = stockResolution.product?._id;
      const quantity = Number(item.quantity || 0);

      if (!stockProductId || !Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      quantityMap.set(
        stockProductId,
        Number(quantityMap.get(stockProductId) || 0) + quantity,
      );
    });

    return quantityMap;
  }, [editingItem?.items, stockProducts]);

  const dealerBillStockWarnings = useMemo(() => {
    const requestedQuantityMap = new Map<string, number>();
    const warnings: string[] = [];
    const processedProducts = new Set<string>();

    orderedProducts.forEach((product, index) => {
      const quantity = Number(watchedItems?.[index]?.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const stockResolution = resolveStockProduct(product.productName, product.mrp, stockProducts);
      if (!stockResolution.product) {
        warnings.push(
          stockResolution.reason === "ambiguous"
            ? `Multiple stock products matched "${product.productName}". Please align stock product name or MRP first.`
            : `Stock product not found for "${product.productName}". Please update stocks of this product first.`,
        );
        return;
      }

      const stockProductId = stockResolution.product._id;
      requestedQuantityMap.set(
        stockProductId,
        Number(requestedQuantityMap.get(stockProductId) || 0) + quantity,
      );
    });

    watchedCustomItems.forEach((item) => {
      const productName = String(item?.productName || "").trim();
      const quantity = Number(item?.quantity || 0);

      if (!productName || !Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const stockResolution = resolveStockProduct(productName, item?.mrp, stockProducts);
      if (!stockResolution.product) {
        warnings.push(
          stockResolution.reason === "ambiguous"
            ? `Multiple stock products matched "${productName}". Please align stock product name or MRP first.`
            : `Stock product not found for "${productName}". Please update stocks of this product first.`,
        );
        return;
      }

      const stockProductId = stockResolution.product._id;
      requestedQuantityMap.set(
        stockProductId,
        Number(requestedQuantityMap.get(stockProductId) || 0) + quantity,
      );
    });

    requestedQuantityMap.forEach((requestedQuantity, stockProductId) => {
      const stockProduct = stockProducts.find((product) => product._id === stockProductId);
      if (!stockProduct) {
        return;
      }

      const restoredQuantity = Number(editingStockRestoreMap.get(stockProductId) || 0);
      const availableQuantity = Number(stockProduct.currentStock || 0) + restoredQuantity;

      if (requestedQuantity > availableQuantity && !processedProducts.has(stockProductId)) {
        warnings.push(
          `${stockProduct.productName} has only ${availableQuantity} in stock, but ${requestedQuantity} is requested. Please update stocks of this product.`,
        );
        processedProducts.add(stockProductId);
      }
    });

    return Array.from(new Set(warnings));
  }, [editingStockRestoreMap, orderedProducts, stockProducts, watchedCustomItems, watchedItems]);

  useEffect(() => {
    if (!modalOpen) return;

    const currentItems = form.getFieldValue("items") || [];
    if (currentItems.length) {
      form.setFieldValue(
        "items",
        currentItems.map((item: DealerBillMasterItem) => ({
          ...item,
          amount: calculateAmountFromMargin(item?.productRate, selectedDealer?.margin),
        })),
      );
    }

    const currentCustomItems = form.getFieldValue("customItems") || [];
    if (currentCustomItems.length) {
      form.setFieldValue(
        "customItems",
        currentCustomItems.map((item: DealerBillCustomItem) => ({
          ...item,
          amount: item?.amount ?? item?.productRate,
        })),
      );
    }
  }, [form, modalOpen, selectedDealer?.margin]);

  const buildMasterItems = (bill?: DealerBillRecord | null) =>
    orderedProducts.map((product) => {
      const matchedItem = bill?.items?.find((item) => {
        const itemProductId =
          typeof item.productId === "object" ? item.productId?._id : item.productId;
        return itemProductId === product._id;
      });

      return {
        productId: product._id,
        productName: product.productName,
        mrp: product.mrp,
        productRate: matchedItem?.productRate ?? product.productRate,
        amount: matchedItem?.amount,
        quantity: matchedItem?.quantity,
      };
    });

  const orderedActiveBillItems = useMemo(() => {
    if (!activeBill?.items?.length) {
      return [];
    }

    const productSequenceById = new Map(
      orderedProducts.map((product, index) => [
        product._id,
        Number.isFinite(Number(product.sequence)) && Number(product.sequence) > 0
          ? Number(product.sequence)
          : index + 1,
      ]),
    );

    return [...activeBill.items].sort((left, right) => {
      const leftProductId =
        typeof left.productId === "object" ? left.productId?._id : left.productId;
      const rightProductId =
        typeof right.productId === "object" ? right.productId?._id : right.productId;
      const leftSequence = leftProductId
        ? productSequenceById.get(leftProductId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      const rightSequence = rightProductId
        ? productSequenceById.get(rightProductId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      if (leftProductId && rightProductId) {
        return 0;
      }

      if (leftProductId) {
        return -1;
      }

      if (rightProductId) {
        return 1;
      }

      return String(left.productName || "").localeCompare(String(right.productName || ""));
    });
  }, [activeBill?.items, orderedProducts]);

  const orderedExportBillItems = useMemo(() => {
    if (!exportBill?.items?.length) {
      return [];
    }

    const productSequenceById = new Map(
      orderedProducts.map((product, index) => [
        product._id,
        Number.isFinite(Number(product.sequence)) && Number(product.sequence) > 0
          ? Number(product.sequence)
          : index + 1,
      ]),
    );

    return [...exportBill.items].sort((left, right) => {
      const leftProductId =
        typeof left.productId === "object" ? left.productId?._id : left.productId;
      const rightProductId =
        typeof right.productId === "object" ? right.productId?._id : right.productId;
      const leftSequence = leftProductId
        ? productSequenceById.get(leftProductId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      const rightSequence = rightProductId
        ? productSequenceById.get(rightProductId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;

      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      if (leftProductId && rightProductId) {
        return 0;
      }

      if (leftProductId) {
        return -1;
      }

      if (rightProductId) {
        return 1;
      }

      return String(left.productName || "").localeCompare(String(right.productName || ""));
    });
  }, [exportBill?.items, orderedProducts]);

  const buildCustomItems = (bill?: DealerBillRecord | null) =>
    (bill?.items || [])
      .filter((item) => {
        const itemProductId =
          typeof item.productId === "object" ? item.productId?._id : item.productId;
        return !itemProductId;
      })
      .map((item) => ({
        productName: item.productName || "",
        productRate: item.productRate,
        amount: item.amount ?? item.productRate,
        quantity: item.quantity,
      }));

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      dealerId: undefined,
      billDate: dayjs(),
      kattaCount: undefined,
      items: buildMasterItems(),
      customItems: [],
    });
    setModalOpen(true);
  };

  const openEdit = (item: DealerBillRecord) => {
    setEditingItem(item);
    form.setFieldsValue({
      dealerId: item.dealerId?._id || "",
      billDate: dayjs(item.billDate),
      kattaCount: item.kattaCount ?? undefined,
      items: buildMasterItems(item),
      customItems: buildCustomItems(item),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const billDraftTotal = useMemo(() => {
    const masterTotal = watchedItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity || 0);
      const amount = resolveLineAmount(
        item?.amount,
        item?.productRate,
        selectedDealer?.margin,
      );

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + quantity * amount;
    }, 0);

    const customTotal = watchedCustomItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity || 0);
      const amount = resolveCustomAmount(item?.amount, item?.productRate);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + quantity * amount;
    }, 0);

    return masterTotal + customTotal;
  }, [selectedDealer?.margin, watchedItems, watchedCustomItems]);

  const handleSubmit = async (values: DealerBillFormValues) => {
    setSaving(true);

    try {
      if (dealerBillStockWarnings.length) {
        message.warning(dealerBillStockWarnings[0]);
        setSaving(false);
        return;
      }

      const kattaCount = Number(values.kattaCount);

      if (!Number.isFinite(kattaCount) || kattaCount <= 0) {
        form.setFields([
          {
            name: "kattaCount",
            errors: ["Please enter katta greater than 0"],
          },
        ]);
        setSaving(false);
        return;
      }

      const masterItems = (values.items || [])
        .filter((item) => item.productId && Number(item.quantity) > 0)
        .map((item) => ({
          productId: String(item.productId),
          productName: String(item.productName || "").trim(),
          mrp: Number(item.mrp || 0),
          productRate: Number(item.productRate || 0),
          amount: resolveLineAmount(
            item.amount,
            Number(item.productRate || 0),
            selectedDealer?.margin,
          ),
          quantity: Number(item.quantity || 0),
        }));

      const customItems = (values.customItems || [])
        .filter(
          (item) =>
            String(item.productName || "").trim() &&
            Number(item.quantity) > 0 &&
            Number(item.amount) >= 0,
        )
        .map((item) => {
          const constAmount = Number(item.amount || 0);
          return {
            productName: String(item.productName || "").trim(),
            mrp: 0,
            productRate: constAmount,
            amount: resolveCustomAmount(item.amount, constAmount),
            quantity: Number(item.quantity || 0),
          };
        });

      const payload = {
        dealerId: values.dealerId,
        billDate: values.billDate.format("YYYY-MM-DD"),
        kattaCount,
        items: [...masterItems, ...customItems],
      };

      if (!payload.items.length) {
        message.error("Please add at least one bill product");
        setSaving(false);
        return;
      }

      if (editingItem) {
        await updateDealerBill(editingItem._id, payload);
        message.success("Dealer bill updated successfully");
      } else {
        await addDealerBill(payload);
        message.success("Dealer bill created successfully");
      }

      closeModal();
      await loadBills(searchText, dateRange);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save dealer bill",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDealerBill(id);
      message.success("Dealer bill deleted successfully");
      if (activeBill?._id === id) {
        setActiveBill(null);
      }
      await loadBills(searchText, dateRange);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete dealer bill",
      );
    }
  };

  const copyBillAsImage = async (bill: DealerBillRecord) => {
    setExportBill(bill);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    if (!exportCardRef.current) {
      message.error("Bill image is not ready yet");
      return;
    }

    setCopyingImage(true);

    try {
      const canvas = await html2canvas(exportCardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        throw new Error("Failed to create image");
      }

      if (navigator.clipboard && "write" in navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        message.success("Bill image copied to clipboard");
        return;
      }

      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `dealer-bill-${getDealerBillSequence(data, bill)}.png`;
      link.click();
      URL.revokeObjectURL(imageUrl);
      message.success("Image download started because clipboard image copy is not supported");
    } catch (err: any) {
      message.error(err?.message || "Failed to copy bill image");
    } finally {
      setCopyingImage(false);
      setExportBill(null);
    }
  };

  const columns: ColumnsType<DealerBillRecord> = [
    {
      title: "#",
      key: "serialNumber",
      width: 90,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Bill Date",
      key: "billDate",
      width: 130,
      render: (_, record) => formatDate(record.billDate),
    },
    {
      title: "Dealer",
      key: "dealerName",
      render: (_, record) => record.dealerId?.dealerName || "-",
    },
    {
      title: "Contact No",
      key: "contactNo",
      width: 150,
      render: (_, record) => record.dealerId?.contactNo || "-",
    },
    {
      title: "City",
      key: "city",
      width: 140,
      render: (_, record) => record.dealerId?.city || "-",
    },
    {
      title: "Katta",
      dataIndex: "kattaCount",
      key: "kattaCount",
      width: 90,
      align: "center",
      render: (value?: number) => value ?? "-",
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      render: (value: number) => (
        <Tag color="green" style={{ margin: 0 }}>
          {formatRoundedCurrency(value)}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Copy bill image">
            <Button
              type="text"
              aria-label="Copy bill image"
              onClick={(event) => {
                event.stopPropagation();
                void copyBillAsImage(record);
              }}
              icon={<CopyOutlined />}
              loading={copyingImage && exportBill?._id === record._id}
              style={{
                color: THEME.mid,
                borderRadius: 10,
                width: 36,
                height: 36,
              }}
            />
          </Tooltip>
          <Tooltip title="Edit bill">
            <Button
              type="text"
              aria-label="Edit bill"
              onClick={(event) => {
                event.stopPropagation();
                openEdit(record);
              }}
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
            title="Delete bill"
            description="Are you sure you want to delete this dealer bill?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="Delete bill">
              <Button
                type="text"
                aria-label="Delete bill"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
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
              Dealer Bills
            </Title>
          </div>
          <Space wrap>
            <Input.Search
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search dealer, city, date, product"
              style={{ width: 300 }}
            />
            <RangePicker
              allowClear
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              format="DD-MM-YYYY"
              size="large"
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
              Add New Bill
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
            onRow={(record) => ({
              onClick: (event) => {
                const target = event.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest(".ant-btn") ||
                  target.closest(".ant-checkbox-wrapper") ||
                  target.closest(".ant-checkbox") ||
                  target.closest("input[type='checkbox']")
                ) {
                  return;
                }
                setActiveBill(record);
              },
            })}
            rowClassName={() => "bill-row bill-row-clickable"}
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Dealer Bill" : "Add New Bill"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Saved products are prefilled. Use Add Product only for one-off bill items.
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
        width={1120}
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
              label="Dealer"
              name="dealerId"
              rules={[{ required: true, message: "Please select dealer" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                placeholder="Select dealer"
                options={dealers.map((dealer) => ({
                  value: dealer._id,
                  label: `${dealer.dealerName} - ${dealer.contactNo}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Bill Date"
              name="billDate"
              rules={[{ required: true, message: "Please select bill date" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                size="large"
                format="DD-MM-YYYY"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          {dealerBillStockWarnings.length ? (
            <Alert
              showIcon
              type="warning"
              message="Stock warning"
              description={
                <div style={{ display: "grid", gap: 6 }}>
                  {dealerBillStockWarnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              }
              style={{
                marginTop: 18,
                borderRadius: 14,
              }}
            />
          ) : null}

          <div style={{ marginTop: 20 }}>
            <Text strong>Saved Products</Text>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "80px 140px minmax(220px, 1.5fr) 180px 140px 180px",
                gap: 16,
                alignItems: "center",
                padding: "18px 20px",
                background: "#eef2f6",
                color: "#111827",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <div>#</div>
              <div>MRP</div>
              <div>Product</div>
              <div>Qty</div>
              <div>Amount</div>
              <div>Total</div>
            </div>

            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {orderedProducts.map((product, index) => {
                const quantity = Number(watchedItems?.[index]?.quantity || 0);
                const amount = resolveLineAmount(
                  watchedItems?.[index]?.amount,
                  watchedItems?.[index]?.productRate ?? product.productRate,
                  selectedDealer?.margin,
                );
                const lineTotal = Number.isFinite(quantity) && quantity > 0
                  ? quantity * amount
                  : 0;

                return (
                  <div
                    key={product._id}
                  style={{
                      display: "grid",
                      gridTemplateColumns:
                        "80px 140px minmax(220px, 1.5fr) 180px 140px 180px",
                      gap: 16,
                      alignItems: "center",
                      padding: "18px 20px",
                      borderTop:
                        index === 0 ? "none" : "1px solid rgba(15, 23, 42, 0.08)",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                      {index + 1}
                    </div>
                    <div style={{ fontSize: 16, color: "#111827" }}>
                      {formatCurrency(product.mrp)}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                        {getProductLabel(product)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {(() => {
                          const stockResolution = resolveStockProduct(
                            product.productName,
                            product.mrp,
                            stockProducts,
                          );

                          if (!stockResolution.product) {
                            return stockResolution.reason === "ambiguous"
                              ? "Multiple stock products matched this dealer product"
                              : "Stock product not found";
                          }

                          const restoredQuantity = Number(
                            editingStockRestoreMap.get(stockResolution.product._id) || 0,
                          );
                          const availableQuantity =
                            Number(stockResolution.product.currentStock || 0) + restoredQuantity;

                          return `Available stock: ${availableQuantity}`;
                        })()}
                      </div>
                    </div>
                    <Form.Item
                      name={["items", index, "quantity"]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        min={0}
                        precision={0}
                        size="large"
                        style={{ width: "100%" }}
                        placeholder="Qty"
                      />
                    </Form.Item>
                    <Form.Item name={["items", index, "amount"]} style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0}
                        precision={2}
                        step={0.01}
                        size="large"
                        style={{ width: "100%" }}
                        placeholder="Amount"
                      />
                    </Form.Item>
                    <div style={{ fontSize: 16, fontWeight: 400, color: "#111827" }}>
                      {formatRoundedCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "none" }}>
            {orderedProducts.map((product, index) => (
              <React.Fragment key={product._id}>
                <Form.Item
                  name={["items", index, "productId"]}
                  initialValue={product._id}
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={["items", index, "productName"]}
                  initialValue={product.productName}
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={["items", index, "productNameGujarati"]}
                  initialValue={product.productNameGujarati}
                  style={{ marginBottom: 0 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={["items", index, "mrp"]}
                  initialValue={product.mrp}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber />
                </Form.Item>
                <Form.Item
                  name={["items", index, "productRate"]}
                  initialValue={product.productRate}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber />
                </Form.Item>
                <Form.Item
                  name={["items", index, "amount"]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber />
                </Form.Item>
              </React.Fragment>
            ))}
          </div>

          <Form.List name="customItems">
            {(fields, { add, remove }) => (
              <>
                <div
                  style={{
                    marginTop: 22,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Text strong>Custom Bill Products</Text>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add(createEmptyCustomItem())}
                    style={{ borderRadius: 10 }}
                  >
                    Add Product
                  </Button>
                </div>

                {fields.length > 0 ? (
                  <div style={{ marginTop: 12, overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: "0 10px",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>#</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Product</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Qty</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Amount</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Total</th>
                          <th style={{ textAlign: "left" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          return (
                            <tr key={field.key}>
                              <td style={{ paddingRight: 8, verticalAlign: "top", minWidth: 50 }}>
                                <div
                                  style={{
                                    height: 48,
                                    display: "flex",
                                    alignItems: "center",
                                    fontWeight: 600,
                                    fontSize: 16,
                                  }}
                                >
                                  {index + 1}
                                </div>
                              </td>
                              <td style={{ paddingRight: 8, verticalAlign: "top", minWidth: 260 }}>
                                <Form.Item
                                  name={[field.name, "productName"]}
                                  rules={[{ required: true, message: "Enter product" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input
                                    size="large"
                                    placeholder="Enter bill-only product"
                                    style={{ borderRadius: 16 }}
                                  />
                                </Form.Item>
                              </td>
                              <td style={{ paddingRight: 8, verticalAlign: "top", minWidth: 110 }}>
                                <Form.Item
                                  name={[field.name, "quantity"]}
                                  rules={[{ required: true, message: "Enter qty" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    precision={0}
                                    size="large"
                                    placeholder="Qty"
                                    style={{ width: "100%" }}
                                  />
                                </Form.Item>
                              </td>
                              <td style={{ paddingRight: 8, verticalAlign: "top", minWidth: 130 }}>
                                <Form.Item
                                  name={[field.name, "amount"]}
                                  rules={[{ required: true, message: "Enter amount" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    precision={2}
                                    step={0.01}
                                    size="large"
                                    placeholder="Amount"
                                    style={{ width: "100%" }}
                                  />
                                </Form.Item>
                              </td>
                              <td style={{ paddingRight: 8, verticalAlign: "top", minWidth: 130 }}>
                                <Form.Item shouldUpdate noStyle>
                                  {() => {
                                    const liveItem =
                                      form.getFieldValue(["customItems", field.name]) || {};
                                    const liveQuantity = Number(liveItem?.quantity || 0);
                                    const liveAmount = Number(liveItem?.amount || 0);
                                    const liveLineTotal =
                                      Number.isFinite(liveQuantity) && liveQuantity > 0
                                        ? liveQuantity * liveAmount
                                        : 0;

                                    return (
                                      <div
                                        style={{
                                          height: 48,
                                          display: "flex",
                                          alignItems: "center",
                                          fontWeight: 400,
                                          fontSize: 16,
                                        }}
                                      >
                                        {formatRoundedCurrency(liveLineTotal)}
                                      </div>
                                    );
                                  }}
                                </Form.Item>
                              </td>
                              <td style={{ verticalAlign: "top", width: 70 }}>
                                <Button
                                  danger
                                  type="text"
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            )}
          </Form.List>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "minmax(220px, 280px) auto",
              gap: 16,
              alignItems: "end",
            }}
          >
            <Form.Item
              label="Katta"
              name="kattaCount"
              rules={[
                { required: true, message: "Please enter katta" },
                {
                  validator: (_, value) =>
                    value === undefined || value === null || value === ""
                      ? Promise.resolve()
                      : Number(value) > 0
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please enter katta greater than 0")),
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={1}
                precision={0}
                size="large"
                placeholder="Enter katta"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 400,
                  color: "#111827",
                }}
              >
                Total: {formatRoundedCurrency(billDraftTotal)}
              </div>
            </div>
          </div>
        </Form>
      </Modal>

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
                      {getDealerBillSequence(data, activeBill)}
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
                    <Text>{activeBill.dealerId?.dealerName || "-"}</Text>
                    <Text style={{ marginLeft: 8 }}>
                      - {activeBill.dealerId?.contactNo || "-"}
                    </Text>
                  </div>
                  <div>
                    <Text strong>City : </Text>
                    <Text>{activeBill.dealerId?.city || "-"}</Text>
                  </div>
                  <div>
                    <Text strong>Margin : </Text>
                    <Text>{Number(activeBill.dealerId?.margin || 0)}%</Text>
                  </div>
                  <div>
                    <Text strong>Created By : </Text>
                    <Text>
                      {activeBill.userId?.name || activeBill.userId?.email || "-"}
                    </Text>
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
                        formatCurrency(
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

                        return formatRoundedCurrency(amount);
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

                        return formatRoundedCurrency(
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
                    Total Amount : {formatRoundedCurrency(activeBill.totalAmount)}
                  </Text>
                </div>
              </div>
            </div>

          </Space>
        ) : null}
      </Modal>

      {exportBill ? (
        <div
          style={{
            position: "fixed",
            left: -10000,
            top: 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          <div
            ref={exportCardRef}
            style={{
              width: 920,
              background: "#ffffff",
              color: "#111111",
              fontFamily:
                "\"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif",
              border: "1px solid #d9d9d9",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                borderBottom: "1px solid #d9d9d9",
              }}
            >
              <div
                style={{
                  padding: "16px 18px",
                  borderRight: "1px solid #d9d9d9",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                DEALER NAME : {exportBill.dealerId?.dealerName || "-"}
              </div>
              <div
                style={{
                  padding: "16px 18px",
                  fontSize: 20,
                  fontWeight: 500,
                  textAlign: "right",
                }}
              >
                DATE : {formatExportDate(exportBill.billDate)}
              </div>
            </div>

            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #d9d9d9",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              KATTA : {exportBill.kattaCount ?? "-"}
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {["#", "M.R.P.", "PRODUCT", "QTY", "AMT", "TOTAL"].map((label) => (
                    <th
                      key={label}
                      style={{
                        borderBottom: "1px solid #d9d9d9",
                        borderRight: "1px solid #d9d9d9",
                        padding: "12px 10px",
                        fontSize: 18,
                        fontWeight: 500,
                        textAlign: label === "PRODUCT" ? "left" : "center",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedExportBillItems.map((item, index) => {
                  const itemProductId =
                    typeof item.productId === "object"
                      ? item.productId?._id
                      : item.productId;
                  const amount = itemProductId
                    ? resolveLineAmount(
                        item.amount,
                        item.productRate,
                        exportBill.dealerId?.margin,
                      )
                    : resolveCustomAmount(item.amount, item.productRate);
                  const total = item.total ?? Number(item.quantity || 0) * amount;

                  return (
                    <tr key={`${itemProductId || item.productName || "custom"}-${index}`}>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          borderRight: "1px solid #d9d9d9",
                          padding: "10px 8px",
                          fontSize: 18,
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          borderRight: "1px solid #d9d9d9",
                          padding: "10px 8px",
                          fontSize: 18,
                          textAlign: "center",
                        }}
                      >
                        {formatRoundedCurrency(Number(item.mrp || 0))}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          borderRight: "1px solid #d9d9d9",
                          padding: "10px 18px",
                          fontSize: 18,
                          textAlign: "left",
                        }}
                      >
                        {String(item.productName || "-").toUpperCase()}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          borderRight: "1px solid #d9d9d9",
                          padding: "10px 8px",
                          fontSize: 18,
                          textAlign: "center",
                        }}
                      >
                        {Number(item.quantity || 0)}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          borderRight: "1px solid #d9d9d9",
                          padding: "10px 8px",
                          fontSize: 18,
                          textAlign: "center",
                        }}
                      >
                        {formatRoundedCurrency(amount)}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #ebebeb",
                          padding: "10px 8px",
                          fontSize: 18,
                          textAlign: "center",
                        }}
                      >
                        {formatRoundedCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 18,
                padding: "18px",
                borderTop: "1px solid #d9d9d9",
                fontSize: 20,
              }}
            >
              <span style={{ fontWeight: 500 }}>TOTAL AMOUNT</span>
              <span style={{ minWidth: 120, textAlign: "right" }}>
                {formatRoundedCurrency(Number(exportBill.totalAmount || 0))}
              </span>
            </div>

            <div
              style={{
                borderTop: "1px solid #d9d9d9",
                padding: "18px",
                display: "grid",
                gap: 10,
                fontSize: 18,
                lineHeight: 1.5,
              }}
            >
              {EXPORT_FOOTER_LINES.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DealerBillsPage;
