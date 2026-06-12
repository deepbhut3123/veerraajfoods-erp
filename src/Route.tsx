import Dashboard from "./DesignLayout/Dashboard";
import RoutesPage from "./Pages/Routes/Index";
import ShopsPage from "./Pages/Shops/Index";
import ProductsPage from "./Pages/Products/Index";
import UsersPage from "./Pages/Users/Index";

const AdminRoutes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/routes",
    name: "Routes",
    component: RoutesPage,
  },
  {
    path: "/shops",
    name: "Shops",
    component: ShopsPage,
  },
  {
    path: "/products",
    name: "Products",
    component: ProductsPage,
  },
  {
    path: "/users",
    name: "Users",
    component: UsersPage,
  },
  ];

export { AdminRoutes };
