import { api } from './http';
import type { RequestOtpResponse, ValidateOtpResponse } from '../models';

export async function requestOtp(mobile: string) {
  const res = await api.post<RequestOtpResponse>('auth/request-otp', { mobile });
  return res.data;
}

export interface ValidateOtpRawResponse { status: number; data?: ValidateOtpResponse; }
export async function validateOtpRaw(params: { mobile: string; otp: string; username?: string; password?: string; department?: number | null; }): Promise<ValidateOtpRawResponse> {
  const res = await api.post<ValidateOtpResponse>('auth/validate-otp', {
    mobile: params.mobile,
    otp: params.otp,
    username: params.username,
    password: params.password,
    department: params.department
  }, { validateStatus: () => true });
  return { status: res.status, data: res.status === 200 ? res.data : undefined };
}

