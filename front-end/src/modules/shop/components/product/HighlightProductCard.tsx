import { useState } from "react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { ProductModal } from "./ProductModal";
import type { Product } from "../../../../core/types";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";
import toast from "react-hot-toast";
import { shopErrorToastOptions, shopSuccessToastOptions } from "../../utils/toast";

interface HighlightProductCardProps {
  product: Product;
}

export function HighlightProductCard({ product }: HighlightProductCardProps) {
  const { addItem } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const discountPercent = clampDiscountPercent(product.discountPercent);
  const salePrice = getProductDiscountedPrice(product.price, discountPercent);
  const isPromotional = hasProductDiscount(discountPercent);
  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

  const handleQuickAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isOutOfStock) {
      toast.error("PRODUTO ESGOTADO NO MOMENTO", shopErrorToastOptions);
      return;
    }

    if (product.sizes && product.sizes.length > 1) {
      setIsModalOpen(true);
      return;
    }

    addItem({
      productId: product.id!,
      name: product.name,
      price: salePrice,
      quantity: 1,
      image: product.image,
    });

    toast.success(`${product.name.toUpperCase()} ADICIONADO AO CARRINHO`, shopSuccessToastOptions);
  };

  return (
    <>
      <article
        onClick={() => !isOutOfStock && setIsModalOpen(true)}
        className={cn(
          "group flex items-stretch gap-2.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all duration-300 md:gap-3 md:rounded-3xl md:p-3 md:shadow-[0_14px_34px_rgba(15,23,42,0.08)] md:backdrop-blur-sm",
          isOutOfStock ? "cursor-not-allowed opacity-60 grayscale" : "cursor-pointer hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_20px_40px_rgba(239,68,68,0.12)]"
        )}
      >
        <div className="relative h-22 w-22 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-26 sm:w-26 md:rounded-2xl">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {isPromotional && (
            <div className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-primary">
              <Sparkles size={11} />
              Mais pedido
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-sm font-black uppercase tracking-[0.04em] text-slate-950 sm:text-base">
                  {product.name}
                </h3>

                <p className="line-clamp-2 text-xs text-slate-500 sm:text-[13px]">
                  {product.description || product.category?.name || "Escolha em alta na loja"}
                </p>
              </div>

              <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">A partir de</p>
              <div className="flex items-center gap-2">
                {isPromotional ? (
                  <span className="text-[11px] text-slate-400 line-through">{formatCurrency(product.price)}</span>
                ) : null}
                <span className="text-lg font-mono font-bold tracking-tighter text-slate-950">
                  {formatCurrency(isPromotional ? salePrice : product.price)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              className="inline-flex h-9 items-center gap-1.5 border border-slate-300 bg-white px-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:border-primary/25 hover:bg-primary hover:text-white md:h-11 md:gap-2 md:rounded-2xl md:px-3 md:text-[10px] md:font-black md:tracking-[0.18em]"
            >
              <Plus size={14} />
              Escolher
            </button>
          </div>
        </div>
      </article>

      <ProductModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
