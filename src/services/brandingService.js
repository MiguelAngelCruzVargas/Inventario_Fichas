import { apiHelpers } from './apiClient';

export const brandingService = {
  async getBranding() {
    return await apiHelpers.get('/configuracion/branding');
  },
  async setBranding({ name, tagline, logoDataUrl }) {
    return await apiHelpers.put('/configuracion/branding', { name, tagline, logoDataUrl });
  }
};

export default brandingService;
