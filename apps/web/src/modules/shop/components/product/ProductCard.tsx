import { useState } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../../../shared/utils";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ProductModal } from "./ProductModal";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    category?: { name: string };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
    });
    toast.success(`${product.name} adicionado!`, {
        icon: '🛒',
        style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
            fontWeight: 'bold'
        }
    });
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -8 }}
        onClick={() => setIsModalOpen(true)}
        className="group bg-white rounded-[2.5rem] border border-slate-100 p-3 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 relative cursor-pointer"
      >
        <div className="relative aspect-square overflow-hidden rounded-[2rem]">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          {/* Badge de preço flutuante */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/20">
              <span className="text-primary font-black text-lg">{formatCurrency(product.price)}</span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-black text-xl text-slate-800 leading-tight group-hover:text-primary transition-colors">
              {product.name}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed font-medium">
            {product.description}
          </p>
          
          <div className="pt-4 flex items-center justify-between">
              <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço Unitário</span>
                  <span className="text-xl font-black text-slate-900">{formatCurrency(product.price)}</span>
              </div>
              <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddToCart}
                  className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-primary transition-colors shadow-lg shadow-slate-900/20"
              >
                  <Plus size={24} />
              </motion.button>
          </div>
        </div>
      </motion.div>

      <ProductModal 
        product={{...product, category: product.category?.name}} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
