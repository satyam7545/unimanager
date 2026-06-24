import { api } from '@/services/api';
import { useAuthStore } from '../store/authStore';

export const authService = {
  login: async (email: string, password: string) => {
    const { setAuth } = useAuthStore.getState();
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken } = response.data;
    setAuth(user, accessToken);
    return user;
  },

  register: async (name: string, email: string, password: string) => {
    const { setAuth } = useAuthStore.getState();
    const response = await api.post('/auth/register', { name, email, password });
    const { user, accessToken } = response.data;
    setAuth(user, accessToken);
    return user;
  },

  logout: async () => {
    const { clearAuth } = useAuthStore.getState();
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Proceed with local logout even if network fail
    } finally {
      clearAuth();
    }
  },

  checkSession: async () => {
    const { setAuth, clearAuth, setLoading } = useAuthStore.getState();
    setLoading(true);
    try {
      // Make a call to /auth/refresh to see if refresh token exists in cookies and is valid
      const response = await api.post('/auth/refresh');
      const { user, accessToken } = response.data;
      setAuth(user, accessToken);
      return user;
    } catch (e) {
      clearAuth();
      return null;
    } finally {
      setLoading(false);
    }
  },
};
