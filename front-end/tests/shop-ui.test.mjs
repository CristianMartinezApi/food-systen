import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("navegação móvel possui somente os três destinos principais", async () => {
  const source = await readSource("src/modules/shop/components/layout/MobileShopNavigation.tsx");

  assert.match(source, /grid-cols-3/);
  assert.match(source, />Cardápio</);
  assert.match(source, />Buscar</);
  assert.match(source, />Meus pedidos</);
  assert.doesNotMatch(source, />Carrinho</);
});

test("cardápio e pedidos compartilham a mesma navegação móvel", async () => {
  const [header, orders] = await Promise.all([
    readSource("src/modules/shop/components/layout/Header.tsx"),
    readSource("src/modules/shop/pages/Orders.tsx"),
  ]);

  assert.match(header, /<MobileShopNavigation slug=\{slug\} active="menu"/);
  assert.match(orders, /<MobileShopNavigation slug=\{slug\} active="orders"/);
});

test("carrinho móvel é uma barra única de largura total", async () => {
  const source = await readSource("src/modules/shop/components/layout/MobileCartBar.tsx");

  assert.match(source, /fixed inset-x-0/);
  assert.match(source, /\bVer carrinho\b/);
  assert.match(source, /subtotal\.toLocaleString/);
  assert.doesNotMatch(source, /rounded-(?:lg|xl|2xl|3xl)/);
});

test("barra do carrinho é reutilizada no cardápio e nos pedidos", async () => {
  const [header, orders] = await Promise.all([
    readSource("src/modules/shop/components/layout/Header.tsx"),
    readSource("src/modules/shop/pages/Orders.tsx"),
  ]);

  assert.match(header, /<MobileCartBar itemCount=\{totalItems\}/);
  assert.match(orders, /<MobileCartBar itemCount=\{totalItems\}/);
});

test("banner usa a configuração da loja e exibe estado operacional", async () => {
  const source = await readSource("src/modules/shop/pages/Home.tsx");

  assert.match(source, /settings\?\.bannerImage/);
  assert.match(source, /settings\?\.logo/);
  assert.match(source, /Aberta agora/);
  assert.match(source, /Fechada agora/);
  assert.match(source, /Aguardando abertura/);
  assert.match(source, /h-32 md:inset-0 md:h-full/);
});

test("categorias aparecem antes dos favoritos e do cardápio", async () => {
  const source = await readSource("src/modules/shop/pages/Home.tsx");
  const categoriesIndex = source.indexOf('aria-labelledby="categories-title"');
  const highlightsIndex = source.indexOf("highlightedProducts.length > 0");
  const menuIndex = source.indexOf('id="menu-section"');

  assert.ok(categoriesIndex > 0, "seção de categorias não encontrada");
  assert.ok(highlightsIndex > categoriesIndex, "favoritos devem vir depois das categorias");
  assert.ok(menuIndex > highlightsIndex, "cardápio deve vir depois dos favoritos");
});

test("ações principais usam nomenclatura direta e consistente", async () => {
  const [productModal, checkout, sidebar, orders] = await Promise.all([
    readSource("src/modules/shop/components/product/ProductModal.tsx"),
    readSource("src/modules/shop/pages/Checkout.tsx"),
    readSource("src/modules/shop/components/layout/NavSidebar.tsx"),
    readSource("src/modules/shop/pages/Orders.tsx"),
  ]);

  assert.match(productModal, /Adicionar ao carrinho/);
  assert.match(productModal, /Atualizar item/);
  assert.match(checkout, /Escolher pagamento/);
  assert.match(checkout, /Confirmar pedido/);
  assert.match(sidebar, /Cardápio completo/);
  assert.match(orders, /Endereço não informado/);

  const customerCopy = `${productModal}\n${checkout}\n${sidebar}\n${orders}`;
  assert.doesNotMatch(customerCopy, /Sua Cesta|Cesto de Histórico|Menu completo|SIGNATURE|Explorar Menu/i);
});

test("cabeçalho móvel permanece estável durante a rolagem", async () => {
  const source = await readSource("src/modules/shop/components/layout/Header.tsx");

  assert.doesNotMatch(source, /IntersectionObserver/);
  assert.match(source, />Entregar em</);
  assert.match(source, />Menu</);
  assert.match(source, /md:hidden/);
});
