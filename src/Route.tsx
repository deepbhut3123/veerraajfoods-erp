import Dashboard from "./DesignLayout/Dashboard";
import AttendancePage from "./Pages/Attendance/Index";
import BillsPage from "./Pages/Bills/Index";
import DealerBillsPage from "./Pages/DealerBills/Index";
import DealerPage from "./Pages/DealerManagement/Index";
import DealerPaymentsPage from "./Pages/DealerPayments/Index";
import DealerProductsPage from "./Pages/DealerProducts/Index";
import DealerStatementPage from "./Pages/DealerStatement/Index";
import OrdersPage from "./Pages/Orders/Index";
import ExpenseEntriesPage from "./Pages/Expense/Entries";
import ExpensePurchasesPage from "./Pages/Expense/Purchase";
import OnlineCustomersPage from "./Pages/OnlineOrders/Customers";
import OnlineOrdersPage from "./Pages/OnlineOrders/Orders";
import OnlineProductsPage from "./Pages/OnlineOrders/Products";
import OnlineStockPage from "./Pages/OnlineOrders/Stock";
import StocksDashboardPage from "./Pages/Stocks/Dashboard";
import StocksEntriesPage from "./Pages/Stocks/Entries";
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
    path: "/online-orders",
    name: "Online Orders",
    component: OnlineOrdersPage,
  },
  {
    path: "/online-products",
    name: "Online Products",
    component: OnlineProductsPage,
  },
  {
    path: "/online-stock",
    name: "Online Stock",
    component: OnlineStockPage,
  },
  {
    path: "/online-customers",
    name: "Online Customers",
    component: OnlineCustomersPage,
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
    path: "/orders",
    name: "Orders",
    component: OrdersPage,
  },
  {
    path: "/dealer-payments",
    name: "Dealer Payments",
    component: DealerPaymentsPage,
  },
  {
    path: "/dealer-statement",
    name: "Dealer Statement",
    component: DealerStatementPage,
  },
  {
    path: "/stocks-dashboard",
    name: "Stocks Dashboard",
    component: StocksDashboardPage,
  },
  {
    path: "/stocks-entry",
    name: "Stocks Entry",
    component: StocksEntriesPage,
  },
  {
    path: "/expense-purchases",
    name: "Purchase",
    component: ExpensePurchasesPage,
  },
  {
    path: "/expense-entries",
    name: "Expense Entry",
    component: ExpenseEntriesPage,
  },
  {
    path: "/attendance",
    name: "Attendance",
    component: AttendancePage,
  },
  {
    path: "/users",
    name: "Users",
    component: UsersPage,
  },
  ];

export { AdminRoutes };
