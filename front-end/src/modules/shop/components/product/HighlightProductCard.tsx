import { useState } from "react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { ProductModal } from "./ProductModal";
import type { Product } from "../../../../core/types";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";

interface HighlightProductCardProps {
  product: Product;
}

export function HighlightProductCard({ product }: HighlightProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const discountPercent = clampDiscountPercent(product.discountPercent);
  const salePrice = getProductDiscountedPrice(product.price, discountPercent);
  const isPromotional = hasProductDiscount(discountPercent);
  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

  return (
    <>
      <article
        onClick={() => !isOutOfStock && setIsModalOpen(true)}
        className={cn(
          "group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow] duration-200",
          isOutOfStock ? "cursor-not-allowed opacity-60 grayscale" : "cursor-pointer hover:border-primary/30 hover:shadow-md"
        )}
      >
        <div className="relative h-20 w-full overflow-hidden bg-slate-100 md:h-24">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {isPromotional && (
            <div className="absolute left-1.5 top-1.5 bg-rose-600 px-1.5 py-0.5 text-[8px] font-black text-white">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="min-w-0 p-2.5">
          <h3 className="line-clamp-2 min-h-8 text-[11px] font-black uppercase leading-tight text-slate-950 md:text-xs">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {isPromotional ? <span className="text-[9px] text-slate-400 line-through">{formatCurrency(product.price)}</span> : null}
            <span className="font-mono text-xs font-bold text-slate-950 md:text-sm">
              {formatCurrency(isPromotional ? salePrice : product.price)}
            </span>
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
