import { api, buildQuery, getBaseUrl } from './http';
import type { DocumentItem, UploadDocumentRequestFields, BulkZipRequest } from '../models';

export async function listDocuments() {
  const res = await api.get<DocumentItem[]>('documents');
  return res.data;
}

export async function searchDocuments(criteria: { majorHeadId?: number; minorHeadId?: number; from?: string; to?: string; tags?: string[] }) {
  const qs = buildQuery({
    majorHeadId: criteria.majorHeadId,
    minorHeadId: criteria.minorHeadId,
    from: criteria.from,
    to: criteria.to,
    tags: criteria.tags && criteria.tags.length ? criteria.tags.join(',') : undefined
  });
  const res = await api.get<DocumentItem[]>(`documents/search${qs}`);
  return res.data;
}

export async function getTags() {
  const res = await api.get<{ id: number; name: string }[]>('documents/tags');
  return res.data;
}

export async function uploadDocument(data: UploadDocumentRequestFields) {
  const form = new FormData();
  form.append('File', data.file);
  form.append('MajorHeadId', String(data.majorHeadId));
  form.append('MinorHeadId', String(data.minorHeadId));
  if (data.remarks) form.append('Remarks', data.remarks);
  if (data.documentDate) form.append('DocumentDate', data.documentDate);
  data.tags.forEach(t => form.append('Tags', t));
  const res = await api.post<{ id: number; fileName: string }>('documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function downloadFile(fileName: string): Promise<Blob> {
  const url = `${getBaseUrl().replace(/\/$/, '')}/documents/download/${fileName}`;
  const res = await api.get(url, { responseType: 'blob' });
  return res.data as Blob;
}

export async function downloadZip(payload: BulkZipRequest): Promise<Blob> {
  const res = await api.post(`${getBaseUrl().replace(/\/$/, '')}/documents/download/zip`, payload, { responseType: 'blob' });
  return res.data as Blob;
}
