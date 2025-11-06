import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: {
    email?: string;
    username?: string;
    password?: string;
    phoneNumber?: string;
    otpCode?: string;
  }) => Promise<void>;
  register: (userData: any) => Promise<void>;
  registerAdmin: (userData: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  logout: () => void;
  countryCode: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [countryCode, setCountryCode] = useState<string>('US');
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: {
      email?: string;
      username?: string;
      password?: string;
      phoneNumber?: string;
      otpCode?: string;
    }) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/auth/send-otp', { email });
      return response.json();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    },
  });

  const registerAdminMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      username: string;
      firstName: string;
      lastName: string;
    }) => {
      const response = await apiRequest('POST', '/api/auth/admin/register', userData);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    },
  });

  const login = async (credentials: {
    email?: string;
    username?: string;
    password?: string;
    phoneNumber?: string;
    otpCode?: string;
  }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: any) => {
    await registerMutation.mutateAsync(userData);
  };

  const registerAdmin = async (userData: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
  }) => {
    await registerAdminMutation.mutateAsync(userData);
  };

  const sendOtp = async (email: string) => {
    await sendOtpMutation.mutateAsync(email);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    queryClient.clear();
  };

  const detectCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.country_code) {
        setCountryCode(data.country_code);
      }
    } catch (error) {
      console.error('Failed to detect country:', error);
      // Fallback to US
      setCountryCode('US');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    detectCountry();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: loginMutation.isPending || registerMutation.isPending || registerAdminMutation.isPending || sendOtpMutation.isPending,
        login,
        register,
        registerAdmin,
        sendOtp,
        logout,
        countryCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}