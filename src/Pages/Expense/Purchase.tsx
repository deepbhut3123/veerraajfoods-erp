import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  createPurchaseProduct,
  createPurchase,
  deletePurchase,
  getAllPurchaseProducts,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
} from "../../Utils/Api";

const { Title, Text } = Typography;

type PurchaseItem = {
  productName: string;
  qtyKg: number;
  rate: number;
  tax: number;
  taxAmount: number;
  transport: number;
  total: number;
};

type PurchaseRow = {
  _id?: string;
  id?: string;
  purchaseDate: string;
  totalAmount: number;
  items: PurchaseItem[];
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  };
};

type PurchaseFormValues = {
  purchaseDate: dayjs.Dayjs;
  items: Array<{
    productName?: string;
    qtyKg?: number;
    rate?: number;
    tax?: number;
    transport?: number;
  }>;
};

type PurchaseProductOption = {
  _id?: string;
  id?: string;
  productName: string;
};

const THEME = {
  dark: "#0f3d3e",
  mid: "#00695C",
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const getPurchaseId = (record?: PurchaseRow | null) => record?._id || record?.id || "";

const getLineValues = (row?: {
  qtyKg?: number;
  rate?: number;
  tax?: number;
  transport?: number;
}) => {
  const qtyKg = Number(row?.qtyKg || 0);
  const rate = Number(row?.rate || 0);
  const tax = Number(row?.tax || 0);
  const transport = Number(row?.transport || 0);
  const baseAmount = qtyKg * rate;
  const taxAmount = (baseAmount * tax) / 100;
  const total = baseAmount + taxAmount + transport;

  return {
    taxAmount,
    total,
  };
};

const createEmptyItem = () => ({
  productName: "",
  qtyKg: undefined,
  rate: undefined,
  tax: 0,
  transport: 0,
});

const ExpensePurchasesPage: React.FC = () => {
  const [data, setData] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseRow | null>(null);
  const [activePurchase, setActivePurchase] = useState<PurchaseRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [purchaseProducts, setPurchaseProducts] = useState<PurchaseProductOption[]>([]);
  const [savingPurchaseProduct, setSavingPurchaseProduct] = useState(false);
  const [productSearchText, setProductSearchText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");
  const [form] = Form.useForm<PurchaseFormValues>();

  const appendPurchaseProductOption = (productName?: string) => {
    const normalized = String(productName || "").trim();
    if (!normalized) {
      return;
    }

    setPurchaseProducts((previous) => {
      const exists = previous.some(
        (item) => item.productName.trim().toLowerCase() === normalized.toLowerCase(),
      );

      if (exists) {
        return previous;
      }

      return [
        ...previous,
        {
          productName: normalized,
        },
      ].sort((left, right) => left.productName.localeCompare(right.productName));
    });
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const response = await getAllPurchases();
      setData(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPurchases();
  }, []);

  useEffect(() => {
    const loadPurchaseProducts = async () => {
      try {
        const response = await getAllPurchaseProducts();
        setPurchaseProducts(Array.isArray(response?.data) ? response.data : []);
      } catch (err: any) {
        message.error(
          err?.response?.data?.message || err?.message || "Failed to load purchase products",
        );
      }
    };

    void loadPurchaseProducts();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      purchaseDate: dayjs(),
      items: [createEmptyItem()],
    });
    setModalOpen(true);
  };

  const openEdit = async (record: PurchaseRow) => {
    const purchaseId = getPurchaseId(record);
    if (!purchaseId) {
      message.error("Purchase id is missing");
      return;
    }

    setSaving(true);
    try {
      const response = await getPurchaseById(purchaseId);
      const purchase = response?.data as PurchaseRow;
      (purchase.items || []).forEach((item) => appendPurchaseProductOption(item.productName));
      setEditingItem(purchase);
      form.setFieldsValue({
        purchaseDate: dayjs(purchase.purchaseDate),
        items: (purchase.items || []).map((item) => ({
          productName: item.productName,
          qtyKg: item.qtyKg,
          rate: item.rate,
          tax: item.tax,
          transport: item.transport,
        })),
      });
      setModalOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to load purchase");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: PurchaseFormValues) => {
    setSaving(true);

    try {
      const items = (values.items || [])
        .map((item) => ({
          productName: String(item.productName || "").trim(),
          qtyKg: Number(item.qtyKg || 0),
          rate: Number(item.rate || 0),
          tax: Number(item.tax || 0),
          transport: Number(item.transport || 0),
        }))
        .filter(
          (item) =>
            item.productName &&
            Number.isFinite(item.qtyKg) &&
            item.qtyKg > 0 &&
            Number.isFinite(item.rate) &&
            item.rate >= 0 &&
            Number.isFinite(item.tax) &&
            item.tax >= 0 &&
            Number.isFinite(item.transport) &&
            item.transport >= 0,
        );

      if (!items.length) {
        message.warning("Please add at least one valid purchase item");
        setSaving(false);
        return;
      }

      const payload = {
        purchaseDate: values.purchaseDate.format("YYYY-MM-DD"),
        items,
      };

      if (editingItem) {
        await updatePurchase(getPurchaseId(editingItem), payload);
        message.success("Purchase updated successfully");
      } else {
        await createPurchase(payload);
        message.success("Purchase created successfully");
      }

      closeModal();
      await loadPurchases();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to save purchase");
      setSaving(false);
    }
  };

  const handleDelete = async (record: PurchaseRow) => {
    try {
      const purchaseId = getPurchaseId(record);
      await deletePurchase(purchaseId);
      message.success("Purchase deleted successfully");
      if (getPurchaseId(activePurchase) === purchaseId) {
        setActivePurchase(null);
      }
      await loadPurchases();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Failed to delete purchase");
    }
  };

  const watchedItems = Form.useWatch("items", form);
  const purchaseProductOptions = purchaseProducts.map((item) => ({
    value: item.productName,
    label: item.productName,
  }));
  const normalizedProductSearch = productSearchText.trim();
  const canCreatePurchaseProduct =
    Boolean(normalizedProductSearch) &&
    !purchaseProducts.some(
      (item) => item.productName.trim().toLowerCase() === normalizedProductSearch.toLowerCase(),
    );

  const handleCreatePurchaseProduct = async () => {
    const productName = normalizedProductSearch;
    if (!productName || !canCreatePurchaseProduct) {
      return;
    }

    setSavingPurchaseProduct(true);
    try {
      const response = await createPurchaseProduct({ productName });
      const created = response?.data as PurchaseProductOption | undefined;
      const nextName = String(created?.productName || productName).trim();
      appendPurchaseProductOption(nextName);
      setProductSearchText("");
      message.success("Purchase product added successfully");
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || "Failed to add purchase product",
      );
    } finally {
      setSavingPurchaseProduct(false);
    }
  };

  const draftTotal = useMemo(
    () =>
      (watchedItems || []).reduce((sum: number, item: PurchaseFormValues["items"][number]) => {
        const line = getLineValues(item);
        return sum + line.total;
      }, 0),
    [watchedItems],
  );

  const filteredData = useMemo(
    () =>
      data.filter((record) => {
        const matchesMonth = dayjs(record.purchaseDate).isValid()
          ? dayjs(record.purchaseDate).format("YYYY-MM") === selectedMonth
          : false;
        const matchesProduct =
          selectedProductFilter === "all" ||
          (record.items || []).some(
            (item) =>
              String(item.productName || "").trim().toLowerCase() ===
              selectedProductFilter.trim().toLowerCase(),
          );

        return matchesMonth && matchesProduct;
      }),
    [data, selectedMonth, selectedProductFilter],
  );

  const monthFilteredData = useMemo(
    () =>
      data.filter((record) => {
        const parsed = dayjs(record.purchaseDate);
        return parsed.isValid() && parsed.format("YYYY-MM") === selectedMonth;
      }),
    [data, selectedMonth],
  );

  const visibleTotalAmount = useMemo(
    () => {
      if (selectedProductFilter === "all") {
        return filteredData.reduce((sum, record) => sum + Number(record.totalAmount || 0), 0);
      }

      return monthFilteredData.reduce((sum, record) => {
        const productTotal = (record.items || []).reduce((itemSum, item) => {
          const matchesProduct =
            String(item.productName || "").trim().toLowerCase() ===
            selectedProductFilter.trim().toLowerCase();

          return matchesProduct ? itemSum + Number(item.total || 0) : itemSum;
        }, 0);

        return sum + productTotal;
      }, 0);
    },
    [filteredData, monthFilteredData, selectedProductFilter],
  );

  const columns: ColumnsType<PurchaseRow> = [
    {
      title: "#",
      key: "serial",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "purchaseDate",
      key: "purchaseDate",
      render: (value) => <Text strong>{formatDate(value)}</Text>,
    },
    {
      title: "Items",
      key: "itemsCount",
      width: 120,
      render: (_, record) => record.items?.length || 0,
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 220,
      render: (value) => <Text strong style={{ color: THEME.mid }}>{formatCurrency(value)}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit purchase">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                void openEdit(record);
              }}
              style={{ color: THEME.mid, borderRadius: 10, width: 36, height: 36 }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete purchase"
            description="Are you sure you want to delete this purchase?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={(event) => {
              event?.stopPropagation();
              void handleDelete(record);
            }}
          >
            <Tooltip title="Delete purchase">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
                style={{ borderRadius: 10, width: 36, height: 36 }}
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
        minHeight: "calc(100vh - 50px)",
        background:
          "radial-gradient(circle at top left, rgba(13, 148, 136, 0.12) 0%, rgba(13, 148, 136, 0) 32%), linear-gradient(180deg, #f7fcfb 0%, #eff7f5 42%, #f8fafc 100%)",
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(0, 105, 92, 0.08)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
        }}
      >
        <Space
          align="start"
          style={{
            width: "100%",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4, color: THEME.dark }}>
              Purchase
            </Title>
            <Text type="secondary">
              Purchase list with add and edit modal, matching the rest of your ERP modules.
            </Text>
          </div>

          <Space size={12} wrap>
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 16,
                border: "1px solid rgba(0, 105, 92, 0.12)",
                background: "linear-gradient(135deg, rgba(224, 247, 246, 0.92) 0%, rgba(240, 253, 250, 0.98) 100%)",
                minWidth: 180,
              }}
            >
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Purchase Total
              </Text>
              <Text strong style={{ color: THEME.mid, fontSize: 20 }}>
                {formatCurrency(visibleTotalAmount)}
              </Text>
            </div>

            <DatePicker
              picker="month"
              size="large"
              value={dayjs(`${selectedMonth}-01`)}
              onChange={(value) => setSelectedMonth((value || dayjs()).format("YYYY-MM"))}
              format="MMMM YYYY"
              allowClear={false}
              style={{ minWidth: 180 }}
            />

            <Select
              size="large"
              value={selectedProductFilter}
              onChange={setSelectedProductFilter}
              style={{ minWidth: 220 }}
              options={[
                { value: "all", label: "All Products" },
                ...purchaseProductOptions,
              ]}
              placeholder="Filter by product"
            />

            <Button
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{
                height: 42,
                paddingInline: 18,
                borderRadius: 12,
                border: "none",
                color: "#fff",
                fontWeight: 700,
                background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
              }}
            >
              Add Purchase
            </Button>
          </Space>
        </Space>

        <Table
          rowKey={(record) => getPurchaseId(record)}
          dataSource={filteredData}
          columns={columns}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No purchases found" /> }}
          scroll={{ x: "max-content", y: 560 }}
          onRow={(record) => ({
            onClick: () => {
              const purchaseId = getPurchaseId(record);
              if (!purchaseId) return;

              setDetailsLoading(true);
              void getPurchaseById(purchaseId)
                .then((response) => setActivePurchase(response?.data || null))
                .catch((err: any) => {
                  message.error(
                    err?.response?.data?.message || err?.message || "Failed to load purchase details",
                  );
                })
                .finally(() => setDetailsLoading(false));
            },
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      <Modal
        title={
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: THEME.dark }}>
              {editingItem ? "Edit Purchase" : "Add Purchase"}
            </span>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>
              Add purchase date and item rows with qty, rate, tax and transport.
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingItem ? "Update Purchase" : "Save Purchase"}
        okButtonProps={{
          loading: saving,
          style: {
            background: "linear-gradient(135deg, #00695C 0%, #0f766e 100%)",
            borderColor: "#00695C",
            borderRadius: 10,
          },
        }}
        cancelButtonProps={{ style: { borderRadius: 10 } }}
        width={1100}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Purchase Date"
            name="purchaseDate"
            rules={[{ required: true, message: "Please select purchase date" }]}
            style={{ marginBottom: 18 }}
          >
            <DatePicker size="large" style={{ width: 260 }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 120px 120px 100px 130px 130px 130px 70px",
                    gap: 12,
                    padding: "0 4px",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  <span>Product</span>
                  <span>Qty (Kg)</span>
                  <span>Rate</span>
                  <span>Tax %</span>
                  <span>Tax Amount</span>
                  <span>Transport</span>
                  <span>Total</span>
                  <span />
                </div>

                {fields.map((field) => {
                  const currentRow = watchedItems?.[field.name] || {};
                  const { taxAmount, total } = getLineValues(currentRow);

                  return (
                    <div
                      key={field.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 120px 120px 100px 130px 130px 130px 70px",
                        gap: 12,
                        alignItems: "center",
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid rgba(0, 105, 92, 0.08)",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fbfb 100%)",
                      }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, "productName"]}
                        rules={[{ required: true, message: "Enter product" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          size="large"
                          showSearch
                          options={purchaseProductOptions}
                          placeholder="Select or search product"
                          filterOption={(input, option) =>
                            String(option?.label || "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          onSearch={setProductSearchText}
                          onDropdownVisibleChange={(open) => {
                            if (!open) {
                              setProductSearchText("");
                            }
                          }}
                          dropdownRender={(menu) => (
                            <>
                              {menu}
                              {canCreatePurchaseProduct ? (
                                <>
                                  <Divider style={{ margin: "8px 0" }} />
                                  <div style={{ padding: "0 8px 8px" }}>
                                    <Button
                                      type="dashed"
                                      block
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => void handleCreatePurchaseProduct()}
                                      loading={savingPurchaseProduct}
                                    >
                                      Add "{normalizedProductSearch}"
                                    </Button>
                                  </div>
                                </>
                              ) : null}
                            </>
                          )}
                        />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        name={[field.name, "qtyKg"]}
                        rules={[{ required: true, message: "Qty" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber size="large" min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        name={[field.name, "rate"]}
                        rules={[{ required: true, message: "Rate" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber size="large" min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        name={[field.name, "tax"]}
                        rules={[{ required: true, message: "Tax" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber size="large" min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <div>
                        <Text strong>{formatCurrency(taxAmount)}</Text>
                      </div>

                      <Form.Item
                        {...field}
                        name={[field.name, "transport"]}
                        rules={[{ required: true, message: "Transport" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber size="large" min={0} style={{ width: "100%" }} />
                      </Form.Item>

                      <div>
                        <Text strong style={{ color: THEME.mid }}>{formatCurrency(total)}</Text>
                      </div>

                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        style={{ width: 40, height: 40, borderRadius: 12 }}
                      />
                    </div>
                  );
                })}

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => add(createEmptyItem())}
                  style={{ width: "fit-content", borderRadius: 12, height: 42 }}
                >
                  Add Product
                </Button>
              </div>
            )}
          </Form.List>

          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(0, 105, 92, 0.06)",
              border: "1px solid rgba(0, 105, 92, 0.12)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Text strong style={{ fontSize: 16, color: THEME.mid }}>
              Total: {formatCurrency(draftTotal)}
            </Text>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(activePurchase)}
        onCancel={() => setActivePurchase(null)}
        footer={null}
        width={980}
        title="Purchase Details"
      >
        {detailsLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Text>Loading purchase details...</Text>
          </div>
        ) : activePurchase ? (
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
                  <Text type="secondary">Purchase No</Text>
                  <div>
                    <Text strong style={{ fontSize: 18 }}>
                      {filteredData.findIndex((item) => getPurchaseId(item) === getPurchaseId(activePurchase)) + 1}
                    </Text>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Text type="secondary">Purchase Date</Text>
                  <div>
                    <Text strong>{formatDate(activePurchase.purchaseDate)}</Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <Table
                  rowKey={(_, index) => `item-${index}`}
                  dataSource={activePurchase.items}
                  pagination={false}
                  locale={{ emptyText: "No purchase items found" }}
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
                      title: "Product",
                      dataIndex: "productName",
                      key: "productName",
                    },
                    {
                      title: "Qty (Kg)",
                      dataIndex: "qtyKg",
                      key: "qtyKg",
                      width: 110,
                    },
                    {
                      title: "Rate",
                      dataIndex: "rate",
                      key: "rate",
                      width: 120,
                    },
                    {
                      title: "Tax %",
                      dataIndex: "tax",
                      key: "tax",
                      width: 100,
                      render: (value) => `${value}%`,
                    },
                    {
                      title: "Tax Amount",
                      dataIndex: "taxAmount",
                      key: "taxAmount",
                      width: 130,
                    },
                    {
                      title: "Transport",
                      dataIndex: "transport",
                      key: "transport",
                      width: 130,
                    },
                    {
                      title: "Total",
                      dataIndex: "total",
                      key: "total",
                      width: 140,
                      render: (value) => formatCurrency(value),
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0, 105, 92, 0.15)",
                    background: "rgba(0, 105, 92, 0.06)",
                  }}
                >
                  <Text strong>Total Amount : {formatCurrency(activePurchase.totalAmount)}</Text>
                </div>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default ExpensePurchasesPage;
