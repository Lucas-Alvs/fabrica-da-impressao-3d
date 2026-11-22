import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Layout do painel: valida a sessão no servidor antes de renderizar qualquer tela. */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
