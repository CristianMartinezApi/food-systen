import { useState } from "react";
import { Plus, Flame, Star, ShoppingCart } from "lucide-react";
import { formatCurrency, cn } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ProductModal } from "./ProductModal";
import type { Product } from "../../../../core/types";
import { clampDiscountPercent, getProductDiscountedPrice, hasProductDiscount } from "../../../../shared/utils/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const discountPercent = clampDiscountPercent(product.discountPercent);
  const salePrice = getProductDiscountedPrice(product.price, discountPercent);
  const isPromotional = hasProductDiscount(discountPercent);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
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
    
    toast.success(`${product.name.toUpperCase()} ADICIONADO!`, {
        icon: '💎',
        style: {
            borderRadius: '24px',
            background: '#020617',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '900',
            letterSpacing: '0.2em',
            padding: '20px 32px',
            border: '1px solid rgba(255,255,255,0.1)'
        }
    });
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -12 }}
        onClick={() => setIsModalOpen(true)}
        className="group bg-white rounded-xl md:rounded-[3.5rem] border border-slate-100 p-2 md:p-4 shadow-2xl shadow-slate-200/40 hover:shadow-primary/10 transition-all duration-700 relative cursor-pointer overflow-hidden"
      >
        {/* Glow de fundo no hover */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative h-44 md:h-auto md:aspect-4/5 overflow-hidden rounded-2xl md:rounded-[2.8rem] shadow-inner bg-slate-50">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
          />
          
          {/* Badge Superior */}
          <div className="absolute top-2 md:top-4 left-2 md:left-6 flex flex-col gap-1 md:gap-1.5">
            <div className="bg-white/90 backdrop-blur-xl px-2 md:px-3 py-1 rounded-xl md:rounded-2xl shadow-lg border border-white/50 flex items-center gap-1 md:gap-1.5">
                <Star size={10} className="text-primary fill-primary md:h-4 md:w-4" />
                <span className="text-[8px] md:text-[9px] font-body font-medium text-slate-900 uppercase tracking-[0.06em]">Escolha Premium</span>
            </div>
            {!isPromotional && product.price > 40 && (
                 <div className="bg-slate-900/90 backdrop-blur-xl px-2 md:px-3 py-1 rounded-xl md:rounded-2xl shadow-lg flex items-center gap-1 md:gap-1.5 w-fit">
                    <Flame size={10} className="text-primary animate-pulse md:h-4 md:w-4" />
                    <span className="text-[8px] md:text-[9px] font-body font-medium text-white uppercase tracking-[0.06em]">Mais Vendido</span>
                </div>
            )}
            {isPromotional && (
              <div className="bg-rose-500/95 backdrop-blur-xl px-2 md:px-3 py-1 rounded-xl md:rounded-2xl shadow-lg flex items-center gap-1 md:gap-1.5 w-fit">
                <span className="text-[8px] md:text-[9px] font-body font-black text-white uppercase tracking-[0.08em]">Promoção</span>
                <span className="text-[8px] md:text-[9px] font-body font-bold text-white uppercase tracking-[0.08em]">-{discountPercent}%</span>
              </div>
            )}
          </div>

          {/* Badge de Preço Flutuante Estilo Luxury */}
          <div className="absolute bottom-2 md:bottom-6 right-2 md:right-6 bg-slate-950 px-2 md:px-6 py-1 md:py-3 rounded-lg md:rounded-2xl shadow-2xl shadow-slate-950/40 border border-white/10 group-hover:bg-primary transition-all duration-500">
              {isPromotional ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[7px] md:text-[9px] uppercase tracking-[0.18em] text-white/60 line-through">{formatCurrency(product.price)}</span>
                  <span className="text-white font-mono text-[10px] md:text-numeric tracking-tighter">{formatCurrency(salePrice)}</span>
                </div>
              ) : (
                <span className="text-white font-mono text-[10px] md:text-numeric tracking-tighter">{formatCurrency(product.price)}</span>
              )}
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="space-y-1">
            <span className="text-label font-body font-medium text-primary uppercase tracking-[0.06em] leading-none">
                {product.category?.name || "SIGNATURE"}
            </span>
            <h3 className="font-display font-bold text-xl md:text-heading-2 text-slate-950 leading-none tracking-tighter uppercase group-hover:text-primary transition-colors">
                {product.name}
            </h3>
          </div>
          
          <p className="text-slate-400 text-[10px] md:text-body line-clamp-2 leading-relaxed font-body uppercase tracking-wider opacity-60">
            {product.description || "Ingredientes selecionados para uma experiência gastronômica inesquecível e luxuosa."}
          </p>
          
          <div className="pt-2 md:pt-4 flex items-center justify-between">
              <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.06em] text-slate-300">Inicia em</span>
                  <span className="text-numeric font-mono text-slate-900 tracking-tighter">{formatCurrency(isPromotional ? salePrice : product.price)}</span>
              </div>
              
              <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddToCart}
                  className="bg-slate-50 text-slate-950 w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.8rem] flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all duration-500 border border-slate-100 shadow-sm group/btn relative"
              >
                  <Plus size={20} className="md:size-6 group-hover/btn:rotate-90 transition-transform duration-500" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center scale-0 group-hover/btn:scale-100 transition-all shadow-lg shadow-primary/40">
                    <ShoppingCart size={10} className="text-white" />
                  </div>
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
