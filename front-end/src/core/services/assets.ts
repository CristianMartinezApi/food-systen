import { api } from '../config/api';

interface UploadImageAssetResponse {
  url?: string;
  relativeUrl?: string;
}

export async function uploadImageAsset(dataUrl: string, folder: string): Promise<string> {
  const response = await api.post('/assets/image', { dataUrl, folder }) as UploadImageAssetResponse;
  // Prefer relative URL to avoid host/protocol mismatch behind proxy in production.
  return response?.relativeUrl || response?.url || dataUrl;
}
