"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12h4l3 8 4-16 3 8h4" },
  {
    href: "/orcamentos",
    label: "Orçamentos",
    icon: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M14 3v5h5"
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M21 19v-1a4 4 0 0 0-3-3.87 M16 3.13A4 4 0 0 1 16 11"
  },
  {
    href: "/materiais",
    label: "Materiais",
    icon: "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z M3 7.5 12 12l9-4.5 M12 12v9"
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.67-2.3H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 3.6 1.7 1.7 0 0 0 10.3 2V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 2.9 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20.4 9v.09a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.09"
  }
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
              active ? "bg-brand text-ink shadow-glow" : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <NavIcon path={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-white">Fábrica Da</p>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-brand">Impressão 3D</p>
        </div>
      </Link>

      {nav}

      <div className="space-y-2">
        <Link href="/orcamentos/novo" onClick={() => setOpen(false)} className="btn-primary w-full">
          + Novo orçamento
        </Link>
        <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-white/55 transition hover:text-white">
          Sair do painel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 bg-ink lg:block">{sidebarContent}</aside>

      {/* Barra mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="text-xs font-extrabold uppercase leading-tight tracking-wide text-white">
            Fábrica Da
            <br />
            <span className="text-brand">Impressão 3D</span>
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Drawer mobile */}
      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[280px] bg-ink shadow-2xl">{sidebarContent}</div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
