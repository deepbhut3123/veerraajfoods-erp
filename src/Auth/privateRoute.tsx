import React, { ReactNode, useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { AuthContext } from "./AuthContext";

const PrivateRoute: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { authData } = useContext(AuthContext);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <Spin className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }} />;
  }

  return authData?.token ? <><Outlet /></> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
