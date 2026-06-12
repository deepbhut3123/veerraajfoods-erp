import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Master from './MasterLayout/Master';
import { AdminRoutes } from './Route';
import './App.css';
import './index.css';
import Login from './Auth/Login';
import { AuthContext, AuthProvider } from './Auth/AuthContext';
import Register from './Auth/Register';
import PrivateRoute from './Auth/privateRoute';
import "antd/dist/reset.css"; // for AntD v5+
// import Notifications from './Pages/Notification';
// import { SettingsProvider } from './Pages/Settings/SettingContext';

const AppRoutes: React.FC = () => {
  const { authData } = useContext(AuthContext);
  const isAuthenticated = Boolean(authData?.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate replace to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate replace to="/dashboard" /> : <Register />}
        />
        <Route element={<PrivateRoute />}>
          {AdminRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<Master children={<route.component />} />}
            />
          ))}
        </Route>
        <Route
          path="*"
          element={<Navigate replace to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      {/* <SettingsProvider> */}
      {/* <Notifications /> */}
      <AppRoutes />
      {/* </SettingsProvider> */}
    </AuthProvider>
  );
};

export default App;
