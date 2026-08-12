import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

export type User = {
  id?: string;
  email?: string;
  Email?: string;
  name?: string;
  fullName?: string;
  FullName?: string;
  phone?: string;
  PhoneNumber?: string;
  role?: string;
  tierName?: string;
  branchId?: string;
  BranchId?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set default auth header for future requests
      api.setAuthToken(token);

      // Fetch user profile
      api.getMe()
        .then(async (userData) => {
          const userObj = { ...userData };
          if (userObj.role === 'Customer' || userObj.Role === 'Customer') {
            try {
              const loyalty = await api.getMyLoyalty();
              userObj.tierName = loyalty?.tier?.tierName ?? loyalty?.Tier?.TierName ?? 'Bronze';
            } catch (err) {
              console.error('Error fetching loyalty for auth context:', err);
              userObj.tierName = 'Bronze';
            }
          }
          setUser(userObj);
        })
        .catch(() => {
          localStorage.removeItem('token');
          api.setAuthToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    api.setAuthToken(token);

    let enrichedUser = { ...userData };
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload) {
          const role = payload.role || payload.Role;
          if (role) {
            enrichedUser.role = role;
          }
          const email = payload.email || payload.Email;
          if (email) {
            enrichedUser.email = email;
            enrichedUser.Email = email;
          }
          const sub = payload.sub || payload.Sub;
          if (sub) {
            enrichedUser.id = sub;
          }
          const name = payload.name || payload.Name || payload.unique_name;
          if (name) {
            enrichedUser.fullName = name;
            enrichedUser.FullName = name;
            enrichedUser.name = name;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing token payload:', e);
    }

    setUser(enrichedUser);

    // Fetch the real user data immediately to get FullName from the backend
    api.getMe()
      .then(async (realUser) => {
        if (realUser && Object.keys(realUser).length > 0) {
          const userObj = { ...realUser };
          if (userObj.role === 'Customer' || userObj.Role === 'Customer') {
            try {
              const loyalty = await api.getMyLoyalty();
              userObj.tierName = loyalty?.tier?.tierName ?? loyalty?.Tier?.TierName ?? 'Bronze';
            } catch (err) {
              console.error('Error fetching loyalty for auth context:', err);
              userObj.tierName = 'Bronze';
            }
          }
          setUser(userObj);
        }
      })
      .catch(console.error);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    api.setAuthToken(null);
    setUser(null);
    api.logout(refreshToken).catch(console.error);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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

