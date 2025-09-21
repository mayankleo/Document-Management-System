// TypeScript domain models and DTOs for the DMS frontend

export interface User {
  id: number;
  username: string | null;
  mobile: string;
  isAdmin: boolean;
  departmentID?: number; // optional if returned
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

export interface TagItem {
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
  documentDate: string; // ISO string
  uploadedAt: string;   // ISO string
  uploadedBy: number;
  majorHead: { id: number; name: string };
  minorHead: { id: number; majorHeadId: number; name: string };
  tags: string[];
}

export interface RequestOtpResponse {
  mobile: string;
  otp?: string; // backend returns OTP (for dev); in production this might be removed
}

export interface ValidateOtpResponse {
  id: number;
  username: string;
  mobile: string;
  departmentId: number;
  isAdmin: boolean;
  token: string;
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

export interface UploadDocumentRequestFields {
  file: File;
  majorHeadId: number;
  minorHeadId: number;
  remarks?: string;
  documentDate?: string; // ISO date (yyyy-MM-dd) or full ISO timestamp
  tags: string[];
}

export interface SearchCriteria {
  majorHeadId?: number;
  minorHeadId?: number;
  from?: string; // ISO date
  to?: string;   // ISO date
  tags?: string[]; // will be joined with commas
}

export interface BulkZipRequest {
  fileNames: string[];
  zipName?: string;
}

// Generic API error shape (can extend later)
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
