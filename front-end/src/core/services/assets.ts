import { api } from '../config/api';
import { normalizeAssetUrl } from '../../shared/utils';

interface UploadImageAssetResponse {
  url?: string;
  relativeUrl?: string;
}

export async function uploadImageAsset(dataUrl: string, folder: string): Promise<string> {
  const response = await api.post('/assets/image', { dataUrl, folder }) as UploadImageAssetResponse;
  // Normalize storage URL format to keep compatibility across absolute/relative responses.
  return normalizeAssetUrl(response?.relativeUrl || response?.url || dataUrl);
}
