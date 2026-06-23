import { useCallback } from 'react';
import apiClient from './api-client';
import { useAuthStore } from './auth-store';

interface StudentLoginRequest {
  batchNumber: string;
  nic: string;
}

interface StaffLoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export function useAuth() {
  const { user, isAuthenticated, setUser, setTokens, setLoading, setError, logout } =
    useAuthStore();

  const studentLogin = useCallback(
    async (credentials: StudentLoginRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<AuthResponse>('/auth/student/login', credentials);
        const { accessToken, refreshToken, user: userData } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setTokens(accessToken, refreshToken);
        setUser(userData);

        return response.data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || 'Login failed. Please try again.';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setTokens, setUser],
  );

  const staffLogin = useCallback(
    async (credentials: StaffLoginRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<AuthResponse>('/auth/staff/login', credentials);
        const { accessToken, refreshToken, user: userData } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setTokens(accessToken, refreshToken);
        setUser(userData);

        return response.data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || 'Login failed. Please try again.';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setTokens, setUser],
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    logout();
  }, [logout]);

  return {
    user,
    isAuthenticated,
    studentLogin,
    staffLogin,
    logout: handleLogout,
  };
}
