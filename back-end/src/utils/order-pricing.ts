export type PricingSize = { name: string; price: number };
export type PricingAddon = { name: string; price: number };
export type PricingOption = { id?: string | number; name: string; price?: number };
export type PricingGroup = { id?: string | number; name: string; options: PricingOption[] };

export type PricingProduct = {
  price: number;
  discountPercent?: number | null;
  sizes?: PricingSize[] | null;
  addons?: PricingAddon[] | null;
};

export type PricingItemAddon = { name: string; groupId?: string | number | null };
export type PricingItemGuidedSelection = { groupId: string | number; optionIds: Array<string | number> };

export type PricingItem = {
  variation?: string | null;
  addons?: PricingItemAddon[] | null;
  guidedAssemblySelections?: PricingItemGuidedSelection[] | null;
};

export class OrderPricingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Recalcula o preço unitário de um item a partir dos dados autoritativos do
 * produto (banco de dados) — nunca a partir de valores enviados pelo cliente.
 */
export function computeItemUnitPrice(
  product: PricingProduct,
  item: PricingItem,
  guidedGroups: PricingGroup[] | null = null
): number {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  let basePrice = Number(product.price) || 0;

  if (item.variation) {
    const size = sizes.find((s) => s.name === item.variation);
    if (!size) {
      throw new OrderPricingError('SIZE_NOT_FOUND', `Tamanho "${item.variation}" não é válido para este produto.`);
    }
    basePrice = Number(size.price) || 0;
  }

  const discountPercent = Number(product.discountPercent) || 0;
  const discountedBasePrice = round2(basePrice * (1 - discountPercent / 100));

  const productAddons = Array.isArray(product.addons) ? product.addons : [];
  const requestedAddons = Array.isArray(item.addons) ? item.addons : [];
  let addonsTotal = 0;
  for (const requested of requestedAddons) {
    // Itens de montagem guiada chegam misturados no mesmo array de "addons" (o carrinho
    // da loja envia selectedAddons + selectedCustomization juntos), marcados com groupId.
    // Esses já são precificados abaixo via guidedAssemblySelections — pular aqui evita
    // rejeitar o pedido inteiro por um "adicional" que na verdade é opção de montagem.
    if (requested && typeof requested === 'object' && requested.groupId != null) {
      continue;
    }

    const match = productAddons.find((a) => a.name === requested?.name);
    if (!match) {
      throw new OrderPricingError('ADDON_NOT_FOUND', `Adicional "${requested?.name}" não é válido para este produto.`);
    }
    addonsTotal += Number(match.price) || 0;
  }

  const selections = Array.isArray(item.guidedAssemblySelections) ? item.guidedAssemblySelections : [];
  let guidedTotal = 0;
  if (selections.length > 0 && guidedGroups) {
    for (const selection of selections) {
      const group = guidedGroups.find(
        (g) => String(g.id) === String(selection.groupId) || g.name === selection.groupId
      );
      if (!group) continue;
      for (const optionId of selection.optionIds || []) {
        const option = group.options.find((o) => String(o.id ?? o.name) === String(optionId));
        guidedTotal += Number(option?.price) || 0;
      }
    }
  }

  return round2(discountedBasePrice + addonsTotal + guidedTotal);
}

/** Soma as linhas (preço unitário recalculado × quantidade) em um subtotal com 2 casas decimais. */
export function computeOrderSubtotal(lines: Array<{ unitPrice: number; quantity: number }>): number {
  return round2(lines.reduce((sum, line) => sum + round2(line.unitPrice * line.quantity), 0));
}
