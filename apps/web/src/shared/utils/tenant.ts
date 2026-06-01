export function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'saas-system';

  const pathParts = window.location.pathname.split('/');
  
  // Lista de slugs que não são tenants e nomes de páginas comuns
  const reservedSlugs = [
    'admin', 'login', 'register', 'checkout', 'orders', 
    'settings', 'categories', 'products', 'dashboard', ''
  ];
  
  // 1. TENTA PEGAR DA URL (Sempre prioridade se houver um slug válido no path)
  const slugFromPath = pathParts.find(part => part && !reservedSlugs.includes(part));
  if (slugFromPath) {
    return slugFromPath;
  }

  // 2. SE ESTIVER NO ADMIN E NÃO TIVER NA URL, TENTA LOCALSTORAGE
  if (pathParts.includes('admin')) {
    const restaurantData = localStorage.getItem('@FoodSystem:restaurant');
    if (restaurantData) {
      try {
        const restaurant = JSON.parse(restaurantData);
        if (restaurant.slug) return restaurant.slug;
      } catch (e) {
        console.error("Erro ao parsear dados do restaurante", e);
      }
    }
  }

  // 3. FALLBACKS GERAIS
  const stored = localStorage.getItem('tenant_slug');
  if (stored) return stored;

  return 'foodsystem-main';
}
