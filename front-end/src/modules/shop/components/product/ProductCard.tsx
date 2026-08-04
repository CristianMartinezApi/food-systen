import { useState } from "react";
import { Plus } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ProductModal } from "./ProductModal";
import type { Product } from "../../../../core/types";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";
import { shopErrorToastOptions, shopSuccessToastOptions } from "../../utils/toast";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const discountPercent = clampDiscountPercent(product.discountPercent);
  const salePrice = getProductDiscountedPrice(product.price, discountPercent);
  const isPromotional = hasProductDiscount(discountPercent);
  const isOutOfStock = product.trackStock && product.stockQuantity <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

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
      image: product.image
    });

    toast.success(`${product.name.toUpperCase()} ADICIONADO AO CARRINHO`, shopSuccessToastOptions);
  };

  return (
    <>
      <article
        onClick={() => !isOutOfStock && setIsModalOpen(true)}
        className={cn(
          "flex min-h-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:hidden",
          isOutOfStock ? "cursor-not-allowed opacity-60 grayscale" : "cursor-pointer"
        )}
      >
        <div className="relative w-30 shrink-0 bg-slate-100">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {isPromotional && (
            <span className="absolute left-2 top-2 bg-rose-600 px-2 py-1 text-[9px] font-black text-white">
              -{discountPercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="absolute inset-x-0 bottom-0 bg-slate-950/85 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-white">
              Esgotado
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {product.category?.name || "Cardápio"}
            </p>
            <h3 className="mt-1 line-clamp-2 text-sm font-black uppercase leading-tight text-slate-950">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              {isPromotional && (
                <p className="text-[9px] text-slate-400 line-through">{formatCurrency(product.price)}</p>
              )}
              <p className="font-mono text-base font-bold tracking-tight text-slate-950">
                {formatCurrency(isPromotional ? salePrice : product.price)}
              </p>
            </div>
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              aria-label={product.sizes && product.sizes.length > 1 ? `Escolher opções de ${product.name}` : `Adicionar ${product.name} ao carrinho`}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-[10px] font-bold text-white disabled:bg-slate-300"
            >
              <Plus size={15} />
              {product.sizes && product.sizes.length > 1 ? "Escolher opções" : "Adicionar"}
            </button>
          </div>
        </div>
      </article>

      <motion.div
        whileHover={!isOutOfStock ? { y: -12 } : {}}
        onClick={() => !isOutOfStock && setIsModalOpen(true)}
        className={cn(
          "group hidden bg-[#fff8ef] rounded-2xl border border-amber-100/70 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.18)] transition-all duration-700 relative cursor-pointer overflow-hidden md:block",
          isOutOfStock ? "opacity-60 grayscale cursor-not-allowed" : "hover:shadow-[0_30px_56px_rgba(239,68,68,0.22)]"
        )}
      >
        {/* Glow de fundo no hover */}
        {!isOutOfStock && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_38%)] opacity-80 group-hover:opacity-100 transition-opacity duration-700" />}

        <div className="relative h-48 md:h-auto md:aspect-4/5 overflow-hidden rounded-lg md:rounded-2xl shadow-inner bg-amber-50">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
          />

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-black text-sm md:text-xl uppercase tracking-[0.2em] -rotate-12 border-4 border-white px-4 py-2">Esgotado</span>
            </div>
          )}

          <div className="absolute top-4 left-6 flex flex-col gap-1.5">
            {isPromotional && (
              <div className="bg-rose-500/95 backdrop-blur-xl px-3 py-1 rounded-2xl shadow-lg flex items-center gap-1.5 w-fit">
                <span className="text-[9px] font-body font-black text-white uppercase tracking-[0.08em]">Promoção</span>
                <span className="text-[9px] font-body font-bold text-white uppercase tracking-[0.08em]">-{discountPercent}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="space-y-1">
            <span className="text-label font-body font-medium text-primary uppercase tracking-[0.06em] leading-none">
              {product.category?.name || "Cardápio"}
            </span>
            <h3 className="font-display font-bold text-xl md:text-heading-2 text-slate-950 leading-none tracking-tighter uppercase [text-shadow:0_1px_0_rgba(148,163,184,0.55)] transition-colors">
              {product.name}
            </h3>
          </div>

          {product.description ? (
            <p className="text-slate-600 text-[10px] md:text-body line-clamp-2 leading-relaxed font-body uppercase tracking-wider">
              {product.description}
            </p>
          ) : null}

          <div className="pt-2 md:pt-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.06em] text-slate-500">Inicia em</span>
              <span className="text-numeric font-mono text-slate-900 tracking-tighter">{formatCurrency(isPromotional ? salePrice : product.price)}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAddToCart}
              aria-label={product.sizes && product.sizes.length > 1 ? `Escolher opções de ${product.name}` : `Adicionar ${product.name} ao carrinho`}
              className="bg-slate-950 text-white w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-primary transition-all duration-500 border border-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.35)] group/btn relative"
            >
              <Plus size={20} className="md:size-6 group-hover/btn:rotate-90 transition-transform duration-500" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <ProductModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
