import React, { useState } from "react";
import { Form, Input, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../Utils/Api";
import "./Register.css";

const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setIsLoading(true);
    try {
      await registerUser(values);
      message.success("Registration successful! Please log in.");
      setIsLoading(false);
      navigate("/login");
    } catch (error: any) {
      setIsLoading(false);
      message.error(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <h2 className="register-title">Create Account</h2>
        <p className="register-subtitle">Sign up to get started</p>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter your name!" }]}
            className="form-item"
          >
            <Input placeholder="Enter your name" className="form-input" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please enter your email!" }]}
            className="form-item"
          >
            <Input placeholder="Enter email" className="form-input" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
            className="form-item"
          >
            <Input.Password placeholder="Enter password" className="form-input" />
          </Form.Item>

          <Form.Item name="roleId" initialValue={2} hidden>
            <Input type="hidden" />
          </Form.Item>

          <Form.Item>
            <button type="submit" disabled={isLoading} className="register-button">
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>
          </Form.Item>

          <div className="register-footer">
            Already have an account?{" "}
            <Link to="/login" className="register-link">
              Sign in here
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Register;
