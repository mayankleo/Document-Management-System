// Core domain models and DTO interfaces

export interface User {
  id: number;
  username: string | null;
  mobile: string;
  isAdmin: boolean;
  departmentID?: number; // optional - backend user may have department
}

export interface MajorHead {
  id: number;
  name: string;
}

export interface MinorHead {
  id: number;
  majorHeadId: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface DocumentItem {
  id: number;
  fileOriginalName: string;
  fileName: string;
  contentType: string;
  size: number;
  remarks: string;
  documentDate: string; // ISO
  uploadedAt: string; // ISO
  uploadedBy: number;
  majorHead: { id: number; name: string };
  minorHead: { id: number; majorHeadId: number; name: string };
  tags: string[];
}

export interface RequestOtpRequest {
  mobile: string;
}
export interface RequestOtpResponse {
  mobile: string;
  otp?: string; // assuming OTP returned for dev
}

export interface ValidateOtpRequest {
  mobile: string;
  otp: string;
  username?: string | null;
  password?: string | null;
  department?: number | null; // maps to Department
}
export interface ValidateOtpResponse {
  id: number;
  username: string | null;
  mobile: string;
  isAdmin: boolean;
  token: string; // token returned keyed as token in backend composite (user + token). We adapt.
}

export interface CreateAdminUserRequest {
  username: string;
  password: string;
}
export interface CreateAdminUserResponse {
  id: number;
  username: string;
  mobile: string;
  isAdmin: boolean;
}

export interface SearchCriteria {
  majorHeadId?: number;
  minorHeadId?: number;
  from?: string; // ISO date
  to?: string; // ISO date
  tags?: string[]; // will serialize as comma separated
}

export interface BulkZipRequest {
  fileNames: string[];
  zipName?: string;
}

export interface UploadDocumentFormData {
  file: File | null;
  majorHeadId?: number;
  minorHeadId?: number;
  remarks?: string;
  documentDate?: string; // ISO
  tags: string[];
}

export type ApiError = { status: number; message: string };
