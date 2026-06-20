import React, { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
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
  updateDealerBill,
} from "../../Utils/Api";

const { Title, Text } = Typography;
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
  productRate: number;
};

type DealerBillLineItem = {
  productId?: string | DealerProductOption | null;
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
  kattaCount: number;
  items: DealerBillMasterItem[];
  customItems: DealerBillCustomItem[];
};

const EMPTY_MASTER_ITEMS: DealerBillMasterItem[] = [];
const EMPTY_CUSTOM_ITEMS: DealerBillCustomItem[] = [];

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

const createEmptyCustomItem = (): DealerBillCustomItem => ({
  productName: "",
  amount: undefined,
  quantity: undefined,
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

const DealerBillsPage: React.FC = () => {
  const [data, setData] = useState<DealerBillRecord[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [products, setProducts] = useState<DealerProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<DealerBillRecord | null>(null);
  const [activeBill, setActiveBill] = useState<DealerBillRecord | null>(null);
  const [form] = Form.useForm<DealerBillFormValues>();
  const watchedItems = Form.useWatch("items", form) ?? EMPTY_MASTER_ITEMS;
  const watchedCustomItems = Form.useWatch("customItems", form) ?? EMPTY_CUSTOM_ITEMS;
  const selectedDealerId = Form.useWatch("dealerId", form);

  const loadBills = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllDealerBills({
        search: search.trim() || undefined,
      });
      setData(response?.data || []);
      setSelectedRowKeys([]);
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
        const [dealerRes, productRes] = await Promise.all([
          getAllDealers(),
          getAllDealerProducts(),
        ]);
        setDealers(dealerRes?.data || []);
        setProducts(productRes?.data || []);
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
      void loadBills(searchText);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer._id === selectedDealerId),
    [dealers, selectedDealerId],
  );

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
    products.map((product) => {
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
      kattaCount: 0,
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
      kattaCount: item.kattaCount ?? 0,
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
        kattaCount: Number(values.kattaCount || 0),
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
      await loadBills(searchText);
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
      await loadBills(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete dealer bill",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;

    try {
      await Promise.all(selectedRowKeys.map((id) => deleteDealerBill(String(id))));
      if (activeBill && selectedRowKeys.includes(activeBill._id)) {
        setActiveBill(null);
      }
      message.success("Selected dealer bills deleted successfully");
      await loadBills(searchText);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete selected dealer bills",
      );
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
      render: (value: number) => value ?? 0,
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
      title: "Created By",
      key: "userId",
      width: 180,
      render: (_, record) => record.userId?.name || record.userId?.email || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
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
            <Popconfirm
              title="Delete selected bills"
              description={`Are you sure you want to delete ${selectedRowKeys.length} selected bill${selectedRowKeys.length === 1 ? "" : "s"}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={handleBulkDelete}
              disabled={!selectedRowKeys.length}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedRowKeys.length}
                style={{
                  height: 42,
                  paddingInline: 18,
                  borderRadius: 12,
                }}
              >
                Delete Selected
              </Button>
            </Popconfirm>
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
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
                  "140px minmax(220px, 1.5fr) 180px 140px 180px",
                gap: 16,
                alignItems: "center",
                padding: "18px 20px",
                background: "#eef2f6",
                color: "#111827",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <div>MRP</div>
              <div>Product</div>
              <div>Amount</div>
              <div>Qty</div>
              <div>Total</div>
            </div>

            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {products.map((product, index) => {
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
                        "140px minmax(220px, 1.5fr) 180px 140px 180px",
                      gap: 16,
                      alignItems: "center",
                      padding: "18px 20px",
                      borderTop:
                        index === 0 ? "none" : "1px solid rgba(15, 23, 42, 0.08)",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 16, color: "#111827" }}>
                      {formatCurrency(product.mrp)}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                      {product.productName}
                    </div>
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
                    <div style={{ fontSize: 16, fontWeight: 400, color: "#111827" }}>
                      {formatRoundedCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "none" }}>
            {products.map((product, index) => (
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
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Product</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Amount</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Qty</th>
                          <th style={{ textAlign: "left", paddingRight: 8 }}>Total</th>
                          <th style={{ textAlign: "left" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          return (
                            <tr key={field.key}>
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
              rules={[{ required: true, message: "Please enter katta" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
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
                  dataSource={activeBill.items || []}
                  pagination={false}
                  locale={{ emptyText: "No bill items found" }}
                  scroll={{ x: "max-content" }}
                  columns={[
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
                      title: "Qty",
                      dataIndex: "quantity",
                      key: "quantity",
                      render: (value) => value ?? 0,
                      width: 110,
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
                  <Text strong>Katta : {activeBill.kattaCount ?? 0}</Text>
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
    </div>
  );
};

export default DealerBillsPage;
