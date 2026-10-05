import { api } from './client';

export interface AdminStats {
  users: {
    total: number;
    buyers: number;
    sellers: number;
    admins: number;
    banned: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
    deleted: number;
  };
  orders: {
    total: number;
    paid: number;
    revenue_cents: number;
    revenue: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  verified: boolean;
  created_at: string;
}

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/stats');
    return res.data;
  },

  listUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  },

  setUserStatus: async (id: string, status: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/status`, { status });
  },

  setUserRole: async (id: string, role: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/role`, { role });
  },
};
