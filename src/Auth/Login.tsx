import React, { useContext, useState } from "react";
import { Form, Input, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { loginuser } from "../Utils/Api";
import { AuthContext } from "./AuthContext";
import "./Login.css";

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthData } = useContext(AuthContext);
  const Logo_Main = require("../Assets/VEERRAJLOGOR.jpg");
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setIsLoading(true);
    try {
      const res: any = await loginuser(values);

      message.success("Login successful!");

      const authData = {
        token: res.token,
        user: res.user,
        roleId: res.user.roleId || null,
        permissions: res.permissions || [],
      };

      localStorage.setItem("token", res.token);
      localStorage.setItem("authData", JSON.stringify(authData));
      setAuthData(authData);
      setIsLoading(false);
      navigate("/dashboard");
    } catch (error: any) {
      setIsLoading(false);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Login failed";
      message.error(errorMessage);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="circle-decor top-left" />
        <div className="circle-decor bottom-right" />
        <div className="login-content">
          <img
            src={Logo_Main}
            alt="Veerraj Logo"
            className="w-52 h-28 mx-auto mb-10"
          />
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to continue</p>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              rules={[{ required: true, message: "Please enter your e-mail!" }]}
              className="form-item"
            >
              <Input
                className="form-input"
                placeholder="Email address"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Please enter your password!" },
              ]}
              className="form-item"
            >
              <Input.Password
                className="form-input"
                placeholder="Password"
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item>
              <button
                type="submit"
                disabled={isLoading}
                className="login-button"
              >
                {isLoading ? (
                  <>
                    <span className="loader" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </Form.Item>
          </Form>

          <div className="signup-text">
            Don't have an account?{" "}
            <Link to="/register" className="signup-link">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
