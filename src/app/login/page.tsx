import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { BrandMark } from "@/components/ui";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <div className="relative hidden overflow-hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="text-sm font-extrabold uppercase tracking-wide text-white">Fábrica Da</p>
            <p className="text-sm font-extrabold uppercase tracking-wide text-brand">Impressão 3D</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand">Painel administrativo</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-white">
            Precificação precisa para cada peça que sai da mesa.
          </h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-white/55">
            Custos de material, energia, desgaste, manutenção, mão de obra e lucro calculados
            automaticamente para a sua Bambu Lab A1 Mini — com desconto de lote e PDF profissional.
          </p>
          <ul className="mt-8 space-y-3 text-sm font-semibold text-white/70">
            {["Cálculo automático de custos reais", "Precificação em lote com desconto progressivo", "Orçamentos em PDF com a sua identidade"].map(
              (item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[10px] font-extrabold text-ink">
                    ✓
                  </span>
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <p className="relative text-[11px] font-medium text-white/30">
          Fábrica Da Impressão 3D — Orçamentos válidos por 7 dias.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-cloud px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-sm font-extrabold uppercase tracking-wide text-ink">Fábrica Da</p>
              <p className="text-sm font-extrabold uppercase tracking-wide text-brand">Impressão 3D</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-ink">Acesso administrativo</h2>
          <p className="mt-1 text-sm font-medium text-ink/50">
            Entre com suas credenciais para gerenciar orçamentos.
          </p>

          <div className="card mt-6 p-6">
            <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-cloud" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-[11px] font-medium text-ink/35">
            Acesso restrito. Todas as alterações são registradas em log.
          </p>
        </div>
      </div>
    </div>
  );
}
