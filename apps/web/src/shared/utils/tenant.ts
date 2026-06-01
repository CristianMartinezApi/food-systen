export const getTenantSlug = () => {
  if (typeof window === 'undefined') return 'foodsystem-burger';

  const pathParts = window.location.pathname.split('/');
  
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

  // Fallback para desenvolvimento
  return 'foodsystem-burger';
};
