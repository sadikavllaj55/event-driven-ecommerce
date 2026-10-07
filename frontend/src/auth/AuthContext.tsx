import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClaimsSchema } from '../api/schemas';
import { queryKeys } from '../api/queryKeys';
import type { Role } from '../types';

interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Decode a JWT payload (no verification — just reading claims for UI)
function decodeToken(token: string): AuthUser | null {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded), (character) =>
      character.charCodeAt(0),
    );
    const payload = authClaimsSchema.parse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    if (payload.exp !== undefined && payload.exp <= Date.now() / 1000)
      return null;
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    return token ? decodeToken(token) : null;
  });

  const login = (token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) throw new Error('Invalid or expired login token');
    void queryClient.cancelQueries({ queryKey: queryKeys.private });
    queryClient.removeQueries({ queryKey: queryKeys.private });
    localStorage.setItem('token', token);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('token');
    void queryClient.cancelQueries({ queryKey: queryKeys.private });
    queryClient.removeQueries({ queryKey: queryKeys.private });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
