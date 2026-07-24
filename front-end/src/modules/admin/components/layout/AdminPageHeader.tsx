import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  status?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  status,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
            {status}
          </div>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SystemPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}
