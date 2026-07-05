import { message } from "antd";
import axios from "axios";

export const API = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const requestUrl = error?.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

    if (
      error.response &&
      error.response.status === 401 &&
      error.response.status === 404
    ) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      message.error("Session expired. Please log in again.");
    } else if (error.response.status === 403 && !isAuthRequest) {
      window.location.href = "/login";
      message.error("You are not authorized to access this page.");
    }
    return Promise.reject(error);
  },
);

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  roleId?: number;
}) => {
  try {
    const response = await API.post("/auth/register", data);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const loginuser = async (data: {
  email: string;
  password: string;
}) => {
  try {
    const response = await API.post("/auth/login", data);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const getAdminDashboardSummary = async (params?: {
  month?: number;
  year?: number;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await API.get("/admin/dashboard/summary", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminRoutes = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/retailer/routes/all", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addAdminRoute = async (data: {
  routeName: string;
  cityName: string;
}) => {
  try {
    const response = await API.post("/admin/retailer/routes", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAdminRoute = async (
  id: string,
  data: {
    routeName: string;
    cityName: string;
  },
) => {
  try {
    const response = await API.put(`/admin/retailer/routes/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminRoute = async (id: string) => {
  try {
    const response = await API.delete(`/admin/retailer/routes/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminShops = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/retailer/shops", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addAdminShop = async (data: {
  routeId: string;
  shopName: string;
  shopAddress: string;
  mobileNumber: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}) => {
  try {
    const response = await API.post("/admin/retailer/shops", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAdminShop = async (
  id: string,
  data: {
    routeId: string;
    shopName: string;
    shopAddress: string;
    mobileNumber: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
  },
) => {
  try {
    const response = await API.put(`/admin/retailer/shops/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminShop = async (id: string) => {
  try {
    const response = await API.delete(`/admin/retailer/shops/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminBills = async (params?: {
  search?: string;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await API.get("/admin/retailer/bills/all", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addAdminBill = async (data: {
  routeId: string;
  shopId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}) => {
  try {
    const response = await API.post("/admin/retailer/bills", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAdminBill = async (
  id: string,
  data: {
    routeId: string;
    shopId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  },
) => {
  try {
    const response = await API.put(`/admin/retailer/bills/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminBill = async (id: string) => {
  try {
    const response = await API.delete(`/admin/retailer/bills/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkDeleteAdminBills = async (billIds: string[]) => {
  try {
    const response = await API.delete("/admin/retailer/bills", { data: { billIds } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markAdminBillsAsCompleted = async (billIds: string[]) => {
  try {
    const response = await API.patch("/admin/retailer/bills/complete", { billIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const assignAdminBillsToDeliveryMan = async (
  billIds: string[],
  deliveryManId: string,
) => {
  try {
    const response = await API.patch("/admin/retailer/bills/ship", {
      billIds,
      deliveryManId,
      status: "shipped",
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllProducts = async () => {
  try {
    const response = await API.get("/admin/retailer/products");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addProduct = async (data: {
  productName: string;
  mrp: number;
  productRate: number;
}) => {
  try {
    const response = await API.post("/admin/retailer/products", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async (
  id: string,
  data: {
    productName: string;
    mrp: number;
    productRate: number;
  },
) => {
  try {
    const response = await API.put(`/admin/retailer/products/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await API.delete(`/admin/retailer/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reorderProducts = async (productIds: string[]) => {
  try {
    const response = await API.patch("/admin/retailer/products/reorder", { productIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllDealers = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/dealer/dealers", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addDealer = async (data: {
  dealerName: string;
  contactNo: string;
  city: string;
  margin: number;
  isActive?: boolean;
}) => {
  try {
    const response = await API.post("/admin/dealer/dealers", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDealer = async (
  id: string,
  data: {
    dealerName: string;
    contactNo: string;
    city: string;
    margin: number;
    isActive?: boolean;
  },
) => {
  try {
    const response = await API.put(`/admin/dealer/dealers/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDealer = async (id: string) => {
  try {
    const response = await API.delete(`/admin/dealer/dealers/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllDealerProducts = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/dealer/products", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addDealerProduct = async (data: {
  mrp: number;
  productName: string;
  productRate: number;
}) => {
  try {
    const response = await API.post("/admin/dealer/products", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDealerProduct = async (
  id: string,
  data: {
    mrp: number;
    productName: string;
    productRate: number;
  },
) => {
  try {
    const response = await API.put(`/admin/dealer/products/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDealerProduct = async (id: string) => {
  try {
    const response = await API.delete(`/admin/dealer/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reorderDealerProducts = async (productIds: string[]) => {
  try {
    const response = await API.patch("/admin/dealer/products/reorder", { productIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllDealerBills = async (params?: {
  search?: string;
  dealerId?: string;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await API.get("/admin/dealer/bills", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addDealerBill = async (data: {
  dealerId: string;
  billDate: string;
  kattaCount: number;
  items: Array<{
    productId?: string;
    productName: string;
    mrp: number;
    productRate: number;
    amount?: number;
    quantity: number;
  }>;
}) => {
  try {
    const response = await API.post("/admin/dealer/bills", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDealerBill = async (
  id: string,
  data: {
    dealerId: string;
    billDate: string;
    kattaCount: number;
    items: Array<{
      productId?: string;
      productName: string;
      mrp: number;
      productRate: number;
      amount?: number;
      quantity: number;
    }>;
  },
) => {
  try {
    const response = await API.put(`/admin/dealer/bills/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDealerBill = async (id: string) => {
  try {
    const response = await API.delete(`/admin/dealer/bills/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllDealerPayments = async (params?: {
  search?: string;
  dealerId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await API.get("/admin/dealer/payments", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addDealerPayment = async (data: {
  paymentDate: string;
  dealerId: string;
  amount: number;
  paymentType: "cash" | "online" | "bank";
}) => {
  try {
    const response = await API.post("/admin/dealer/payments", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDealerPayment = async (
  id: string,
  data: {
    paymentDate: string;
    dealerId: string;
    amount: number;
    paymentType: "cash" | "online" | "bank";
  },
) => {
  try {
    const response = await API.put(`/admin/dealer/payments/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteDealerPayment = async (id: string) => {
  try {
    const response = await API.delete(`/admin/dealer/payments/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await API.get("/admin/users");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addUser = async (data: {
  name: string;
  email: string;
  password: string;
  roleId: number;
  salary?: number | null;
  isActive?: boolean;
}) => {
  try {
    const response = await API.post("/admin/users", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    roleId?: number;
    salary?: number | null;
    isActive?: boolean;
  },
) => {
  try {
    const response = await API.put(`/admin/users/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await API.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserActiveStatus = async (id: string, isActive: boolean) => {
  try {
    const response = await API.patch(`/admin/users/${id}/status`, { isActive });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAdminAttendance = async (params?: {
  search?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await API.get("/admin/attendance", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAdminAttendance = async (
  id: string,
  data: {
    userId: string;
    date: string;
    inTime: string;
    outTime?: string;
    breakIn?: string;
    breakOut?: string;
    latitude?: number;
    longitude?: number;
    ipAddress?: string;
  },
) => {
  try {
    const response = await API.put(`/admin/attendance/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminAttendance = async (id: string) => {
  try {
    const response = await API.delete(`/admin/attendance/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminStockEntries = async () => {
  try {
    const response = await API.get("/admin/retailer/stocks");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAdminStockEntryById = async (id: string) => {
  try {
    const response = await API.get(`/admin/retailer/stocks/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createAdminStockEntry = async (data: {
  entryDate: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}) => {
  try {
    const response = await API.post("/admin/retailer/stocks", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAdminStockEntry = async (
  id: string,
  data: {
    entryDate: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  },
) => {
  try {
    const response = await API.put(`/admin/retailer/stocks/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminStockEntry = async (id: string) => {
  try {
    const response = await API.delete(`/admin/retailer/stocks/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllPurchases = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/expenses/purchases", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPurchaseById = async (id: string) => {
  try {
    const response = await API.get(`/admin/expenses/purchases/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPurchase = async (data: {
  purchaseDate: string;
  items: Array<{
    productName: string;
    qtyKg: number;
    rate: number;
    tax: number;
    transport: number;
  }>;
}) => {
  try {
    const response = await API.post("/admin/expenses/purchases", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePurchase = async (
  id: string,
  data: {
    purchaseDate: string;
    items: Array<{
      productName: string;
      qtyKg: number;
      rate: number;
      tax: number;
      transport: number;
    }>;
  },
) => {
  try {
    const response = await API.put(`/admin/expenses/purchases/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deletePurchase = async (id: string) => {
  try {
    const response = await API.delete(`/admin/expenses/purchases/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllPurchaseProducts = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/expenses/purchase-products", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPurchaseProduct = async (data: { productName: string }) => {
  try {
    const response = await API.post("/admin/expenses/purchase-products", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllExpenseEntries = async (params?: {
  search?: string;
  expenseType?: string;
}) => {
  try {
    const response = await API.get("/admin/expenses/entries", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getExpenseEntryById = async (id: string) => {
  try {
    const response = await API.get(`/admin/expenses/entries/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createExpenseEntry = async (data: {
  expenseDate: string;
  expenseType: string;
  reason?: string;
  paymentType: "cash" | "online" | "bank";
  amount: number;
}) => {
  try {
    const response = await API.post("/admin/expenses/entries", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateExpenseEntry = async (
  id: string,
  data: {
    expenseDate: string;
    expenseType: string;
    reason?: string;
    paymentType: "cash" | "online" | "bank";
    amount: number;
  },
) => {
  try {
    const response = await API.put(`/admin/expenses/entries/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteExpenseEntry = async (id: string) => {
  try {
    const response = await API.delete(`/admin/expenses/entries/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
