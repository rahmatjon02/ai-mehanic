import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiService, setAuthToken } from '../services/api';
import { Car, User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  cars: Car[];
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshCars: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCars = useCallback(async () => {
    try {
      const list = await apiService.getCars();
      setCars(list);
    } catch {
      setCars([]);
    }
  }, []);

  // Restore session on app start
  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as User);
          setAuthToken(savedToken);
        }
      } catch {
        // Ignore storage errors
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // Load cars whenever user changes
  useEffect(() => {
    if (token && user) {
      refreshCars();
    } else {
      setCars([]);
    }
  }, [token, user, refreshCars]);

  const login = useCallback(async (newToken: string, newUser: User) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setCars([]);
  }, []);

  const value = useMemo(
    () => ({ user, token, cars, loading, login, logout, refreshCars }),
    [user, token, cars, loading, login, logout, refreshCars],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
