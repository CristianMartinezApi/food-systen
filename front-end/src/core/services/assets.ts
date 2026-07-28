import { api } from '../config/api';
import { normalizeAssetUrl } from '../../shared/utils';

interface UploadImageAssetResponse {
  url?: string;
  relativeUrl?: string;
}

export async function uploadImageAsset(dataUrl: string, folder: string): Promise<string> {
  const response = await api.post('/assets/image', { dataUrl, folder }) as UploadImageAssetResponse;
  // Persiste o caminho relativo quando o storage é local; normalizeAssetUrl fica para exibição.
  return response?.relativeUrl || normalizeAssetUrl(response?.url || dataUrl);
}
