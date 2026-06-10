export function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'saas-system';

  const pathParts = window.location.pathname.split('/');

  const reservedSlugs = [
    'admin', 'login', 'register', 'checkout', 'orders',
    'settings', 'categories', 'products', 'dashboard', ''
  ];

  const isAdminRoute = pathParts.includes('admin');

  if (isAdminRoute) {
    const restaurantData = localStorage.getItem('@FoodSystem:restaurant');
    if (restaurantData) {
      try {
        const restaurant = JSON.parse(restaurantData);
        if (restaurant && restaurant.slug) return restaurant.slug;
      } catch (e) {
        console.error('Erro ao parsear dados do restaurante', e);
      }
    }
  }

  const slugFromPath = pathParts.find(part => part && !reservedSlugs.includes(part));
  if (slugFromPath && !isAdminRoute) {
    return slugFromPath;
  }

  const stored = localStorage.getItem('tenant_slug');
  if (stored) return stored;

  return 'foodsystem-main';
}
