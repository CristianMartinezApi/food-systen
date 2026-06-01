export function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'saas-system';

  const pathParts = window.location.pathname.split('/');
  
  // Se for o root literal, não tem tenant (é a Landing Page do SaaS)
  if (pathParts.length <= 2 && pathParts[1] === '') {
    return 'saas-system';
  }

  // Se estiver no admin, tenta pegar do localStorage primeiro
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

  // Lista de slugs que não são tenants e nomes de páginas comuns
  const reservedSlugs = [
    'admin', 'login', 'register', 'checkout', 'orders', 
    'settings', 'categories', 'products', 'dashboard', ''
  ];
  
  // Procura o primeiro segmento que não seja reservado
  const slugFromPath = pathParts.find(part => part && !reservedSlugs.includes(part));
  
  if (slugFromPath) {
    return slugFromPath;
  }

  // Tenta pegar do localStorage como fallback geral (ex: usuário estava navegando e mudou de rota)
  const stored = localStorage.getItem('tenant_slug');
  if (stored) return stored;

  return 'foodsystem-main';
}
