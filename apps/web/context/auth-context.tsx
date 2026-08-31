'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { demoUsers } from '@/lib/demo-data';
import { loginRequest, registerRequest } from '@/lib/api';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  demoMode: boolean;
}

type AuthAction =
  | { type: 'HYDRATE'; payload: Omit<AuthState, 'ready'> }
  | { type: 'LOGIN'; payload: Omit<AuthState, 'ready'> }
  | { type: 'LOGOUT' };

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  register: (formData: FormData) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'renodo.session.v1';
const initialState: AuthState = { user: null, token: null, ready: false, demoMode: false };

function reducer(state: AuthState, action: AuthAction): AuthState {
  if (action.type === 'HYDRATE' || action.type === 'LOGIN') {
    return { ...action.payload, ready: true };
  }
  if (action.type === 'LOGOUT') return { ...initialState, ready: true };
  return state;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Omit<AuthState, 'ready'>;
        dispatch({ type: 'HYDRATE', payload: parsed });
        return;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({
      type: 'HYDRATE',
      payload: { user: null, token: null, demoMode: false },
    });
  }, []);

  const persist = useCallback((payload: Omit<AuthState, 'ready'>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    dispatch({ type: 'LOGIN', payload });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest(email, password);
      persist({ user: result.user, token: result.token, demoMode: false });
    },
    [persist],
  );

  const register = useCallback(
    async (formData: FormData) => {
      const result = await registerRequest(formData);
      persist({ user: result.user, token: result.token, demoMode: false });
    },
    [persist],
  );

  const loginAsDemo = useCallback(
    (role: UserRole) => {
      const safeRole = role === 'admin' ? 'admin' : role === 'manager' ? 'manager' : 'member';
      persist({ user: demoUsers[safeRole], token: `demo-${safeRole}`, demoMode: true });
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, loginAsDemo, register, logout }),
    [state, login, loginAsDemo, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  return context;
}
