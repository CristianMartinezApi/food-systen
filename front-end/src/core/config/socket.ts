import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  withCredentials: true,
  auth: (callback) => {
    const tenantSlug = localStorage.getItem('tenant_slug') || '';
    const customerRaw = localStorage.getItem(`@FoodSystem:customer:${tenantSlug}`) ||
      localStorage.getItem('@FoodSystem:customer');
    let customerPhone = '';
    try {
      customerPhone = JSON.parse(customerRaw || 'null')?.phone || '';
    } catch {
      customerPhone = '';
    }
    callback({
      tenantSlug,
      customerAccessToken: localStorage.getItem(`@FoodSystem:customerAccessToken:${tenantSlug}`) || '',
      customerPhone,
    });
  },
});
