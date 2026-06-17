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
    const response = await API.get("/admin/routes/all", { params });
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
    const response = await API.post("/admin/routes", data);
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
    const response = await API.put(`/admin/routes/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminRoute = async (id: string) => {
  try {
    const response = await API.delete(`/admin/routes/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminShops = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/shops", { params });
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
    const response = await API.post("/admin/shops", data);
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
    const response = await API.put(`/admin/shops/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminShop = async (id: string) => {
  try {
    const response = await API.delete(`/admin/shops/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminBills = async (params?: { search?: string }) => {
  try {
    const response = await API.get("/admin/bills/all", { params });
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
    const response = await API.post("/admin/bills", data);
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
    const response = await API.put(`/admin/bills/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAdminBill = async (id: string) => {
  try {
    const response = await API.delete(`/admin/bills/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkDeleteAdminBills = async (billIds: string[]) => {
  try {
    const response = await API.delete("/admin/bills", { data: { billIds } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markAdminBillsAsCompleted = async (billIds: string[]) => {
  try {
    const response = await API.patch("/admin/bills/complete", { billIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markAdminBillsAsShipped = async (billIds: string[]) => {
  try {
    const response = await API.patch("/admin/bills/ship", { billIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllProducts = async () => {
  try {
    const response = await API.get("/admin/products");
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
    const response = await API.post("/admin/products", data);
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
    const response = await API.put(`/admin/products/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await API.delete(`/admin/products/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const reorderProducts = async (productIds: string[]) => {
  try {
    const response = await API.patch("/admin/products/reorder", { productIds });
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
