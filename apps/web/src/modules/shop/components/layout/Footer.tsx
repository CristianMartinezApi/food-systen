import { motion } from "framer-motion";
import { 
  Instagram, 
  Facebook, 
  MapPin, 
  Phone, 
  Clock, 
  Utensils,
  Heart
} from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import Link from "next/link";
import { useState, useEffect } from "react";

export function Footer() {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Utensils className="text-white" size={20} />
              </div>
              <span className="text-xl font-black text-white tracking-tighter uppercase">
                {settings?.storeName || 'FoodSystem'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              {settings?.bio || "Transformando sua experiência gastronômica com os melhores ingredientes e entrega rápida."}
            </p>
            <div className="flex gap-4">
              {settings?.instagram && (
                <a 
                  href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all group"
                >
                  <Instagram size={18} />
                </a>
              )}
              {settings?.facebook && (
                <a 
                  href={`https://facebook.com/${settings.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all group"
                >
                  <Facebook size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Contact Column */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Phone size={14} />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-white mb-0.5">Telefone</p>
                  <p className="text-slate-400">{settings?.phone || "(00) 00000-0000"}</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <MapPin size={14} />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-white mb-0.5">Endereço</p>
                  <p className="text-slate-400">
                    {settings?.address || "Endereço não informado"}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Hours Column */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Horários</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Clock size={14} />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-white mb-0.5">Funcionamento</p>
                  <p className="text-slate-400">
                    {settings?.operatingHours?.seg?.closed ? 'Fechado' : `${settings?.operatingHours?.seg?.open || '18:00'} - ${settings?.operatingHours?.seg?.close || '23:30'}`} (Segunda)
                  </p>
                  <p className="text-slate-400 text-[10px] mt-1 italic">Consulte horários especiais em feriados.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Links Column */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <Link href={`/${slug}`} className="text-sm hover:text-primary transition-colors">Início</Link>
              </li>
              <li>
                <Link href={`/${slug}#categories`} className="text-sm hover:text-primary transition-colors">Categorias</Link>
              </li>
              <li>
                <Link href="/admin/login" className="text-sm hover:text-primary transition-colors">Acesso Lojista</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-medium">
            © {currentYear} {settings?.storeName || 'FoodSystem'}. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            Feito com <Heart size={10} className="text-red-500 fill-red-500" /> por
            <span className="text-white font-black ml-1 tracking-tighter">FOODSYSTEM.SaaS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
