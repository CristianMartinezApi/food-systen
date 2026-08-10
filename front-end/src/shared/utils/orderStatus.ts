export type OrderMode = "DELIVERY" | "PICKUP" | "DINE_IN";

export function getOrderMode(order: any): OrderMode {
    const type = order?.address?.type;
    if (type === "PICKUP") return "PICKUP";
    if (type === "DINE_IN") return "DINE_IN";
    return "DELIVERY";
}

/**
 * Único ponto de verdade para "qual status vem depois de PREPARING" por modalidade.
 * Usado tanto em Orders/index.tsx (getPrimaryAction, que ainda decide label/estilo por
 * modalidade) quanto em Kitchen/index.tsx (ação única "Pronto") — evita a regra de
 * transição divergir silenciosamente entre as duas telas.
 */
export function getNextStatusAfterPreparing(mode: OrderMode): string {
    if (mode === "PICKUP") return "READY";
    if (mode === "DINE_IN") return "DELIVERED";
    return "OUT_FOR_DELIVERY";
}
