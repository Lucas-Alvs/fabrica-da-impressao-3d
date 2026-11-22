/** Componentes visuais reutilizáveis. */

import Link from "next/link";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
        {icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">{icon}</span>
        ) : null}
      </div>
      <p className="mt-2 text-base font-extrabold leading-tight text-ink [overflow-wrap:normal] sm:text-lg">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs font-medium text-ink/40">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-extrabold text-ink sm:text-lg">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs font-medium text-ink/45">{description}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 bg-cloud/50 px-6 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-ink/50">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function BatchBadge() {
  return (
    <span className="badge bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300">
      ✅ Preço de lote aplicado
    </span>
  );
}

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-xs";
  return (
    <div className={`${box} grid place-items-center rounded-xl bg-brand font-extrabold text-ink shadow-glow`}>
      F3D
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = ""
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "dark" | "ghost";
  className?: string;
}) {
  const classes =
    variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-ghost";
  return (
    <Link href={href} className={`${classes} ${className}`}>
      {children}
    </Link>
  );
}
