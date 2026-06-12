import React, { useEffect, useState } from "react";
import {
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  Button,
  Layout,
  Row,
  Col,
  Avatar,
  Dropdown,
  Menu,
  Badge,
  Divider,
  Modal,
} from "antd";
import { useNavigate } from "react-router-dom";
// import { getNofications, updateNotification } from "../utils/API"; // ✅ Add your updateNotification API

const { Header } = Layout;

interface NavbarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
  disableHoverEffect: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("authData") || "{}");
  const userId = storedUser?.user?._id || "";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const userPhoto = storedUser?.user?.photo;
  const avatarSrc =
    userPhoto && typeof userPhoto === "string"
      ? userPhoto.trim() !== ""
        ? userPhoto.startsWith("http")
          ? userPhoto
          : `${process.env.REACT_APP_IMAGE_URL}/developers/${userPhoto}`
        : process.env.PUBLIC_URL + "/download.png"
      : process.env.PUBLIC_URL + "/download.png";

  // const fetchLogs = async () => {
  //   try {
  //     const logs = await getNofications();
  //     setTaskLogs(logs?.notifications || []);
  //   } catch (error) {
  //     console.error("Error fetching task logs:", error);
  //   }
  // };

  // useEffect(() => {
  //   fetchLogs();
  // }, []);

  // const handleNotificationClick = async (log: any) => {
  //   try {
  //     // Mark specific notification as read
  //     if (!log.isRead) {
  //       await updateNotification(log._id); // Call API to mark this as read
  //       // Update local state
  //       setTaskLogs((prevLogs) =>
  //         prevLogs.map((item) =>
  //           item._id === log._id ? { ...item, isRead: true } : item
  //         )
  //       );
  //     }
  //     // Show modal
  //     setSelectedNotification(log);
  //     setModalVisible(true);
  //   } catch (error) {
  //     console.error("Error updating notification:", error);
  //   }
  // };

  const userMenu = (
    <Menu style={{ borderRadius: "8px", border: "1px solid #f0f0f0" }}>
      {/* <Menu.Item
        key="profile"
        icon={<UserOutlined style={{ fontSize: "16px", color: "black" }} />}
        onClick={() => navigate("/profile")}
      >
        Profile
      </Menu.Item> */}
      {/* <Divider style={{ margin: "4px 0" }} /> */}
      <Menu.Item
        key="logout"
        icon={<LogoutOutlined style={{ fontSize: "16px", color: "#ff4d4f" }} />}
        onClick={handleLogout}
        style={{ color: "#ff4d4f" }}
        className="no-hover-effect"
      >
        Logout
      </Menu.Item>
    </Menu>
  );

  const notificationMenu = (
    <div onClick={(e) => e.stopPropagation()}>
      <Menu
        style={{ borderRadius: "8px", maxHeight: "300px", overflowY: "auto" }}
      >
        {taskLogs.length > 0 ? (
          taskLogs.map((log, index) => (
            <Menu.Item
              key={`log-${index}`}
              style={{
                whiteSpace: "normal",
                fontWeight: log.isRead ? "normal" : "bold",
              }}
              onClick={(e) => {
                e.domEvent.stopPropagation();
                // handleNotificationClick(log);
              }}
            >
              {log.message || "No message"}
            </Menu.Item>
          ))
        ) : (
          <Menu.Item disabled>No logs available</Menu.Item>
        )}
      </Menu>
    </div>
  );

  const unreadCount = taskLogs.filter((log) => !log.isRead).length;

  return (
    <>
      <Header
        className="header"
        style={{
          padding: "0 16px",
          backgroundColor: "#E0F7F6", // light teal to match sidebar
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", // optional subtle shadow
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={4} sm={3} md={2} lg={1}>
            <Button
              type="text"
              icon={
                <MenuOutlined style={{ fontSize: "20px", color: "#004d40" }} />
              } // darker teal for contrast
              style={{ background: "transparent" }}
              onClick={toggleSidebar}
            />
          </Col>

          <Col>
            <Row align="middle" gutter={16}>
              <Col>
                <Dropdown
                  overlay={userMenu}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Avatar
                    style={{
                      cursor: "pointer",
                      backgroundColor: "#b2dfdb", // slightly darker teal for avatar contrast
                      width: "40px",
                      height: "40px",
                      marginBottom: "16px",
                    }}
                    icon={
                      !userPhoto || typeof userPhoto !== "string" ? (
                        <UserOutlined style={{ color: "#004d40" }} />
                      ) : undefined
                    }
                    src={avatarSrc}
                    className="border-2"
                  />
                </Dropdown>
              </Col>
            </Row>
          </Col>
        </Row>
      </Header>

      {/* Notification Modal */}
      <Modal
        width={600}
        height={400}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered={false} // Disable centered to use top positioning
        destroyOnClose
        className="custom-modal"
        style={{
          bottom: 20,
          top: 20,
          maxHeight: "calc(100vh - 3  0px)", // Leaves 20px space at bottom
          margin: "0 auto",
          position: "relative",
          // paddingBottom: 20 // Adds space inside modal at bottom
        }}
        title={
          <div
            style={{
              marginLeft: "11px",
              width: "100%",
              paddingRight: 20, // Optional: Adjust spacing
            }}
          >
            Notification
          </div>
        }
        bodyStyle={{
          // maxHeight: 'calc(90vh - 55px)',
          overflowY: "auto",
          // padding: '20px',
          fontFamily: "inter, sans-serif",
        }}
        styles={{
          header: {
            borderBottom: "1px solid #e0e0e0",
            padding: "12px",
            position: "sticky",
            top: 0,
            backgroundColor: "white",
          },
          content: {
            padding: 10,
            overflow: "hidden",
          },
        }}
      >
        <div className="elements">
          <p style={{ padding: "1vw" }}>
            {selectedNotification?.message || "No message available"}
          </p>
        </div>
        <div className="footer-modals" />
      </Modal>
    </>
  );
};

export default Navbar;
