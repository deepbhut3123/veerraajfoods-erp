import React, { createContext, useState, ReactNode, useEffect } from 'react';

interface AuthData {
  user: any;
  token: any | null;
  roleId: any | null;
  permissions: any[] | null;
}

export interface AuthContextProps {
  [x: string]: any;
  authData: AuthData;
  setAuthData: (data: AuthData) => void;
}

export const AuthContext = createContext<AuthContextProps>({
  authData: { token: null, roleId: null, user: null , permissions : [] },
  setAuthData: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authData, setAuthDataState] = useState<AuthData>(() => {
    const storedAuthData = localStorage.getItem('authData');
    return storedAuthData ? JSON.parse(storedAuthData) : { token: null, roleId: null, user: null , permissions: [] };
  });

  const setAuthData = (data: AuthData) => {
    setAuthDataState(data);
    localStorage.setItem('authData', JSON.stringify(data));
  };

  useEffect(() => {
    return () => {
      localStorage.removeItem('authData');
    };
  }, []);

  return (
    <AuthContext.Provider value={{ authData, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
};