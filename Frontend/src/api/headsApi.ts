import { api } from './http';
import type { MajorHead, MinorHead } from '../models';

export async function getMajorHeads() {
  const res = await api.get<MajorHead[]>('heads/major');
  return res.data;
}

export async function getMinorHeads(majorHeadId: number) {
  const res = await api.get<MinorHead[]>(`heads/minor/${majorHeadId}`);
  return res.data;
}
