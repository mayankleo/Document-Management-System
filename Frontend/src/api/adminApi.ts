import { api } from './http';
import type { CreateAdminUserRequest, CreateAdminUserResponse } from '../models';

export async function createAdminUser(payload: CreateAdminUserRequest) {
  const res = await api.post<CreateAdminUserResponse>('admin/create-user', payload);
  return res.data;
}
