"use client";

import Link from "next/link";
import { LayoutGrid, ReceiptText, Search } from "lucide-react";
import { cn } from "../../../../shared/utils";

type MobileShopNavigationProps = {
  slug: string;
  active: "menu" | "orders";
  onSearch?: () => void;
};

const itemClass = "relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[9px] font-semibold transition-colors";

function ActiveIndicator() {
  return <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-9 bg-primary" />;
}

export function MobileShopNavigation({ slug, active, onSearch }: MobileShopNavigationProps) {
  const searchContent = (
    <>
      <Search size={19} />
      <span className="w-full truncate text-center">Buscar</span>
    </>
  );

  return (
    <nav
      aria-label="Navegação principal da loja"
      className="fixed inset-x-0 bottom-0 z-70 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_14px_rgba(15,23,42,0.08)] md:hidden"
    >
      <div className="mx-auto grid h-14 max-w-sm grid-cols-3">
        <Link
          href={`/${slug}`}
          aria-current={active === "menu" ? "page" : undefined}
          className={cn(itemClass, active === "menu" ? "text-primary" : "text-slate-500")}
        >
          {active === "menu" ? <ActiveIndicator /> : null}
          <LayoutGrid size={19} />
          <span className="w-full truncate text-center">Cardápio</span>
        </Link>

        {onSearch ? (
          <button type="button" onClick={onSearch} className={cn(itemClass, "w-full text-slate-500")}>
            {searchContent}
          </button>
        ) : (
          <Link href={`/${slug}?search=1#menu-section`} className={cn(itemClass, "text-slate-500")}>
            {searchContent}
          </Link>
        )}

        <Link
          href={`/${slug}/orders`}
          aria-current={active === "orders" ? "page" : undefined}
          className={cn(itemClass, active === "orders" ? "text-primary" : "text-slate-500")}
        >
          {active === "orders" ? <ActiveIndicator /> : null}
          <ReceiptText size={19} />
          <span className="w-full truncate text-center">Meus pedidos</span>
        </Link>
      </div>
    </nav>
  );
}
