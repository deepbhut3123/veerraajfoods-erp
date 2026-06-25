import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AuditOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  ShopOutlined,
  SnippetsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "../MasterLayout/Master.css";

const { Sider } = Layout;

type MenuLeafItem = {
  key: string;
  icon: React.ReactNode;
  text: string;
  link: string;
};

type MenuGroupItem = {
  key: string;
  icon: React.ReactNode;
  text: string;
  children: MenuLeafItem[];
};

type SidebarMenuItem = MenuLeafItem | MenuGroupItem;

const MENU_ITEMS: SidebarMenuItem[] = [
  {
    key: "dashboard",
    icon: <DashboardOutlined style={{ color: "inherit" }} />,
    text: "Dashboard",
    link: "/dashboard",
  },
  {
    key: "retailer-group",
    icon: <ShopOutlined style={{ color: "inherit" }} />,
    text: "Retailer",
    children: [
      {
        key: "routes",
        icon: <SnippetsOutlined style={{ color: "inherit" }} />,
        text: "Routes",
        link: "/routes",
      },
      {
        key: "shops",
        icon: <ShopOutlined style={{ color: "inherit" }} />,
        text: "Shops",
        link: "/shops",
      },
      {
        key: "bills",
        icon: <FileTextOutlined style={{ color: "inherit" }} />,
        text: "Bills",
        link: "/bills",
      },
      {
        key: "products",
        icon: <DatabaseOutlined style={{ color: "inherit" }} />,
        text: "Products",
        link: "/products",
      },
    ],
  },
  {
    key: "dealer-group",
    icon: <TeamOutlined style={{ color: "inherit" }} />,
    text: "Dealer",
    children: [
      {
        key: "dealers",
        icon: <TeamOutlined style={{ color: "inherit" }} />,
        text: "Dealers",
        link: "/dealers",
      },
      {
        key: "dealer-products",
        icon: <AppstoreOutlined style={{ color: "inherit" }} />,
        text: "Products",
        link: "/dealer-products",
      },
      {
        key: "dealer-bills",
        icon: <FileTextOutlined style={{ color: "inherit" }} />,
        text: "Bills",
        link: "/dealer-bills",
      },
      {
        key: "dealer-payments",
        icon: <DollarCircleOutlined style={{ color: "inherit" }} />,
        text: "Payments",
        link: "/dealer-payments",
      },
      {
        key: "dealer-statement",
        icon: <AuditOutlined style={{ color: "inherit" }} />,
        text: "Statement",
        link: "/dealer-statement",
      },
    ],
  },
  {
    key: "users",
    icon: <UserOutlined style={{ color: "inherit" }} />,
    text: "Users",
    link: "/users",
  },
];

const isMenuGroup = (item: SidebarMenuItem): item is MenuGroupItem =>
  "children" in item;

const getFlatMenuItems = (items: SidebarMenuItem[]) =>
  items.flatMap((item) => (isMenuGroup(item) ? item.children : item));

const FLAT_MENU_ITEMS = getFlatMenuItems(MENU_ITEMS);

const getParentKeyByChildKey = (childKey: string) => {
  const parent = MENU_ITEMS.find(
    (item) => isMenuGroup(item) && item.children.some((child) => child.key === childKey),
  );

  return parent?.key;
};

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onCollapse: (collapsed: boolean) => void;
  isSmallScreen: boolean;
  disableHover: boolean;
  onItemClick: () => void;
  hoverEffectActive: boolean;
  setHoverEffectActive: (val: boolean) => void;
  forceCollapse: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  onCollapse,
  isSmallScreen,
  disableHover,
  onItemClick,
}) => {
  const ACTIVE_LIGHT_COLOR = "#E0F7F6";
  const DEFAULT_ICON_COLOR = "#00695C";
  const DEFAULT_TEXT_COLOR = "#004D40";
  const Logo_Main = require("../Assets/VEERRAJLOGOR.jpg");
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovering, setIsHovering] = useState(false);
  const [activeMenuItemKey, setActiveMenuItemKey] = useState<string | null>(null);
  const [, setHoverEffectActive] = useState(true);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const siderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentItem = FLAT_MENU_ITEMS.find(
      (item) =>
        location.pathname === item.link ||
        (item.link && location.pathname.startsWith(`${item.link}/`)),
    );

    if (currentItem) {
      setActiveMenuItemKey(currentItem.key);
      const parentKey = getParentKeyByChildKey(currentItem.key);
      setOpenKeys(parentKey ? [parentKey] : []);
    } else {
      setActiveMenuItemKey(null);
      setOpenKeys([]);
    }
  }, [location.pathname]);

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/routes": "Retailer Routes",
      "/shops": "Retailer Shops",
      "/bills": "Retailer Bills",
      "/products": "Retailer Products",
      "/dealers": "Dealers",
      "/dealer-products": "Dealer Products",
      "/dealer-bills": "Dealer Bills",
      "/dealer-payments": "Dealer Payments",
      "/dealer-statement": "Dealer Statement",
      "/users": "Users",
    };

    let title = "VEERRAAJ FOODS";
    if (routeTitles[location.pathname]) {
      title = `${routeTitles[location.pathname]} | VEERRAAJ FOODS`;
    }

    document.title = title;
  }, [location.pathname]);

  const handleMouseEnter = () => {
    if (disableHover) return;
    setIsHovering(true);
    if (collapsed && hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoverEffectActive(false);
  };

  const handleMouseLeave = () => {
    if (disableHover) return;
    setIsHovering(false);
    if (collapsed) {
      const timeout = setTimeout(() => {
        setHoverEffectActive(true);
        setOpenKeys(activeMenuItemKey ? [getParentKeyByChildKey(activeMenuItemKey) || ""] : []);
      }, 300);
      setHoverTimeout(timeout);
    }
  };

  const handleMenuItemClick: MenuProps["onClick"] = ({ key }) => {
    const item = FLAT_MENU_ITEMS.find((menuItem) => menuItem.key === key);

    if (!item) {
      return;
    }

    setActiveMenuItemKey(item.key);
    navigate(item.link);
    onItemClick?.();
    if (isSmallScreen) setCollapsed(true);
  };

  const toggleCollapse = () => {
    onCollapse(!collapsed);
  };

  const handleLogoClick = () => {
    window.location.reload();
  };

  const menuItems: MenuProps["items"] = useMemo(
    () =>
      MENU_ITEMS.map((item) => {
        if (isMenuGroup(item)) {
          return {
            key: item.key,
            icon: (
              <span style={{ fontSize: "20px", color: DEFAULT_ICON_COLOR }}>
                {item.icon}
              </span>
            ),
            label: (
              <span style={{ color: DEFAULT_TEXT_COLOR, fontWeight: 600 }}>
                {item.text}
              </span>
            ),
            children: item.children.map((child) => ({
              key: child.key,
              icon: (
                <span
                  style={{
                    fontSize: "20px",
                    color:
                      activeMenuItemKey === child.key
                        ? ACTIVE_LIGHT_COLOR
                        : DEFAULT_ICON_COLOR,
                  }}
                >
                  {child.icon}
                </span>
              ),
              label: (
                <span
                  style={{
                    color:
                      activeMenuItemKey === child.key
                        ? ACTIVE_LIGHT_COLOR
                        : DEFAULT_TEXT_COLOR,
                    fontWeight: 500,
                  }}
                >
                  {child.text}
                </span>
              ),
            })),
          };
        }

        return {
          key: item.key,
          icon: (
            <span
              style={{
                fontSize: "20px",
                color:
                  activeMenuItemKey === item.key
                    ? ACTIVE_LIGHT_COLOR
                    : DEFAULT_ICON_COLOR,
              }}
            >
              {item.icon}
            </span>
          ),
          label: (
            <span
              style={{
                color:
                  activeMenuItemKey === item.key
                    ? ACTIVE_LIGHT_COLOR
                    : DEFAULT_TEXT_COLOR,
                fontWeight: 500,
              }}
            >
              {item.text}
            </span>
          ),
        };
      }),
    [ACTIVE_LIGHT_COLOR, DEFAULT_ICON_COLOR, DEFAULT_TEXT_COLOR, activeMenuItemKey],
  );

  const normalizedOpenKeys = openKeys.filter(Boolean);

  return (
    <>
      {isSmallScreen ? (
        <Drawer
          placement="left"
          closable={true}
          onClose={toggleCollapse}
          width="200px"
          open={!collapsed}
          maskClosable
          bodyStyle={{
            backgroundColor: "#001529",
            padding: 0,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "#001529",
              padding: "1rem 0",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={Logo_Main}
              alt="logo"
              onClick={handleLogoClick}
              style={{ maxHeight: "8vw", cursor: "pointer" }}
            />
          </div>
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[activeMenuItemKey || ""]}
            openKeys={normalizedOpenKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            onClick={handleMenuItemClick}
            style={{ color: "white", width: "100%" }}
            items={menuItems}
          />
        </Drawer>
      ) : (
        <Sider
          ref={siderRef}
          trigger={null}
          collapsible
          collapsed={collapsed && !(!disableHover && isHovering)}
          collapsedWidth={80}
          width={220}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed",
            height: "100vh",
            zIndex: 1000,
            overflow: "hidden",
            background: "linear-gradient(180deg, #E0F7F6 0%, #B2DFDB 100%)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              backgroundColor: "#E0F7F6",
              marginBottom: "10px",
              padding: "10px 0",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={Logo_Main}
              alt="logo"
              onClick={handleLogoClick}
              style={{
                maxHeight: "70px",
                transition: "all 0.2s",
                width: collapsed ? "60px" : "auto",
                cursor: "pointer",
              }}
            />
          </div>

          <Menu
            mode="inline"
            selectedKeys={[activeMenuItemKey || ""]}
            openKeys={normalizedOpenKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            onClick={handleMenuItemClick}
            style={{
              backgroundColor: "transparent",
              borderRight: "none",
            }}
            items={menuItems}
          />
        </Sider>
      )}
    </>
  );
};

export default Sidebar;
