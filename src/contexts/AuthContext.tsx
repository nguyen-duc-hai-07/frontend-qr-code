import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { authApi } from '@/api/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'ADMIN';

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    const accessToken = res.data.access_token;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    // Decode basic user info from JWT payload
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const decodedJson = JSON.parse(atob(payloadBase64));
      const role = (decodedJson.roles?.[0] || 'USER').replace('ROLE_', '') as 'ADMIN' | 'USER';
      const currentUser: User = {
        id: decodedJson.userId || decodedJson.id || 0,
        username: decodedJson.sub || data.username,
        role: role,
      };
      setUser(currentUser);
      localStorage.setItem('user_info', JSON.stringify(currentUser));
    } catch {
      const fallbackUser: User = {
        id: 0,
        username: data.username,
        role: 'USER',
      };
      setUser(fallbackUser);
      localStorage.setItem('user_info', JSON.stringify(fallbackUser));
    }
  };

  const register = async (data: RegisterRequest) => {
    const res = await authApi.register(data);
    const accessToken = res.data.access_token;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    try {
      const payloadBase64 = accessToken.split('.')[1];
      const decodedJson = JSON.parse(atob(payloadBase64));
      const currentUser: User = {
        id: decodedJson.userId || decodedJson.id || 0,
        username: decodedJson.sub || data.username,
        full_name: data.full_name,
        phone_number: data.phone_number,
        role: 'USER',
      };
      setUser(currentUser);
      localStorage.setItem('user_info', JSON.stringify(currentUser));
    } catch {
      const fallbackUser: User = {
        id: 0,
        username: data.username,
        full_name: data.full_name,
        phone_number: data.phone_number,
        role: 'USER',
      };
      setUser(fallbackUser);
      localStorage.setItem('user_info', JSON.stringify(fallbackUser));
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
