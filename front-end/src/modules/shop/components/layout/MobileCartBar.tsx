"use client";

import { ShoppingCart } from "lucide-react";

type MobileCartBarProps = {
  itemCount: number;
  subtotal: number;
  onOpen: () => void;
};

export function MobileCartBar({ itemCount, subtotal, onOpen }: MobileCartBarProps) {
  if (itemCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed inset-x-0 z-69 flex h-14 items-center justify-between border-b border-rose-700 bg-rose-600 px-5 text-white shadow-[0_-6px_18px_rgba(15,23,42,0.14)] md:hidden"
      style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      aria-label={`Ver carrinho com ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
    >
      <span className="flex items-center gap-2 text-xs font-bold">
        <ShoppingCart size={17} />
        Ver carrinho
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{itemCount}</span>
      </span>
      <span className="font-mono text-sm font-bold">
        {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
    </button>
  );
}
