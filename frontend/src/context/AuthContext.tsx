import  { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '../lib/api';

interface User {
  id: number;
  username: string;
  isPremium: boolean;
  firstName?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    navigate('/login');
  }, [navigate]);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const data = await fetchCurrentUser(storedToken);
        if (data && data.user) {
          const userWithPremium = { ...data.user, isPremium: data.user.plan === 'Paid' };
          setUser(userWithPremium);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    } else {
        setUser(null);
        setToken(null);
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((user: User, token: string) => {
    const userWithPremium = { ...user, isPremium: user.plan === 'Paid' };
    setUser(userWithPremium);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userWithPremium));
    localStorage.setItem('accessToken', token);
    if (userWithPremium.isPremium) {
      navigate('/premium');
    } else {
      navigate('/');
    }
  }, [navigate]);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout, checkAuth }}>
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