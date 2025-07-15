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
  sendOtp: (phoneNumber: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', '/api/auth/send-otp', { phoneNumber });
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

  const sendOtp = async (phoneNumber: string) => {
    await sendOtpMutation.mutateAsync(phoneNumber);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    queryClient.clear();
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
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: loginMutation.isPending || registerMutation.isPending || sendOtpMutation.isPending,
        login,
        register,
        sendOtp,
        logout,
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
