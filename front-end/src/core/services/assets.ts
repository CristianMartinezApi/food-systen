import { api } from '../config/api';

interface UploadImageAssetResponse {
  url?: string;
  relativeUrl?: string;
}

export async function uploadImageAsset(dataUrl: string, folder: string): Promise<string> {
  const response = await api.post('/assets/image', { dataUrl, folder }) as UploadImageAssetResponse;
  return response?.url || dataUrl;
}
