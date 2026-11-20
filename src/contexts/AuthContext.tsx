import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { authApi } from '@/api/auth.api';
import { userApi } from '@/api/user.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_info');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) return null;
    try {
      const res = await userApi.getMyProfile();
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('user_info', JSON.stringify(res.data));
        return res.data;
      }
    } catch {
      // Ignore if offline
    }
    return null;
  }, []);

  // Sync profile on mount if token exists
  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token, refreshProfile]);

  const login = async (data: LoginRequest): Promise<User> => {
    const res = await authApi.login(data);
    const accessToken = res.data.access_token;

    // Decode role & claims from JWT payload
    let role: 'ADMIN' | 'USER' = 'USER';
    let decodedJson: Record<string, unknown> = {};
    try {
      const payloadBase64 = accessToken.split('.')[1];
      decodedJson = JSON.parse(atob(payloadBase64));
      const roles = (decodedJson.roles as string[]) || [];
      const extractedRole = (roles[0] || 'USER').replace('ROLE_', '');
      role = extractedRole === 'ADMIN' ? 'ADMIN' : 'USER';
    } catch (e) {
      console.error('Error decoding token', e);
    }

    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    let currentUser: User = {
      id: Number(decodedJson.userId || decodedJson.id || 0),
      username: (decodedJson.sub as string) || (decodedJson.username as string) || data.username,
      full_name: (decodedJson.full_name as string) || (decodedJson.fullName as string) || undefined,
      phone_number: (decodedJson.phone_number as string) || (decodedJson.phoneNumber as string) || undefined,
      role: role,
    };

    // Cố gắng lấy profile đầy đủ từ backend
    try {
      const profileRes = await userApi.getMyProfile();
      if (profileRes.data) {
        currentUser = profileRes.data;
      }
    } catch {
      // Dùng thông tin từ token giải mã
    }

    setUser(currentUser);
    localStorage.setItem('user_info', JSON.stringify(currentUser));
    return currentUser;
  };

  const register = async (data: RegisterRequest) => {
    const res = await authApi.register(data);
    const accessToken = res.data.access_token;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    let currentUser: User = {
      id: 0,
      username: data.username,
      full_name: data.full_name,
      phone_number: data.phone_number,
      role: 'USER',
    };

    try {
      const payloadBase64 = accessToken.split('.')[1];
      const decodedJson = JSON.parse(atob(payloadBase64));
      currentUser.id = Number(decodedJson.userId || decodedJson.id || 0);
      currentUser.username = (decodedJson.sub as string) || data.username;
    } catch {
      // Fallback
    }

    try {
      const profileRes = await userApi.getMyProfile();
      if (profileRes.data) {
        currentUser = profileRes.data;
      }
    } catch {
      // Use fallback
    }

    setUser(currentUser);
    localStorage.setItem('user_info', JSON.stringify(currentUser));
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
        refreshProfile,
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
