import Dashboard from "./DesignLayout/Dashboard";
import BillsPage from "./Pages/Bills/Index";
import DealerBillsPage from "./Pages/DealerBills/Index";
import DealerPage from "./Pages/DealerManagement/Index";
import DealerProductsPage from "./Pages/DealerProducts/Index";
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
    path: "/bills",
    name: "Bills",
    component: BillsPage,
  },
  {
    path: "/products",
    name: "Products",
    component: ProductsPage,
  },
  {
    path: "/dealers",
    name: "Dealers",
    component: DealerPage,
  },
  {
    path: "/dealer-products",
    name: "Dealer Products",
    component: DealerProductsPage,
  },
  {
    path: "/dealer-bills",
    name: "Dealer Bills",
    component: DealerBillsPage,
  },
  {
    path: "/users",
    name: "Users",
    component: UsersPage,
  },
  ];

export { AdminRoutes };
