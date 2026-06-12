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

export const getAdminDashboardSummary = async () => {
  try {
    const response = await API.get("/admin/dashboard/summary");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminRoutes = async () => {
  try {
    const response = await API.get("/admin/routes/all");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllAdminShops = async () => {
  try {
    const response = await API.get("/admin/shops");
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
