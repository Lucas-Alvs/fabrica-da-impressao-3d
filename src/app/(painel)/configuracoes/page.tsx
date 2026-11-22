import SettingsForm, { PasswordForm } from "@/components/SettingsForm";
import { SectionCard } from "@/components/ui";
import { dbMode, getSettings, getTiers, recentLogs } from "@/lib/repo";
import { dateTimeBR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [settings, tiers, logs] = await Promise.all([getSettings(), getTiers(), recentLogs(15)]);
  const { admin_password_hash, ...safeSettings } = settings;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Administração</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm font-medium text-ink/50">
          Ajustes de custos, margem, faixas de lote e identidade visual dos orçamentos.
        </p>
      </header>

      <SettingsForm settings={safeSettings} tiers={tiers} />

      <SectionCard title="Segurança" description="Login administrativo e backup do banco de dados">
        <PasswordForm />
        <div className="mt-4 grid gap-3 rounded-xl bg-cloud/70 p-4 text-[11px] font-semibold text-ink/55 sm:grid-cols-3">
          <p>
            Banco em uso: <span className="font-extrabold text-ink">{dbMode()}</span>
          </p>
          <p>
            Senha cadastrada: <span className="font-extrabold text-ink">{admin_password_hash ? "sim" : "senha inicial"}</span>
          </p>
          <p>
            Última atualização: <span className="font-extrabold text-ink">{dateTimeBR(settings.updated_at)}</span>
          </p>
        </div>
        <p className="mt-3 text-[11px] font-medium text-ink/40">
          O backup exporta clientes, materiais, orçamentos, configurações e faixas de lote em JSON (sem a senha).
        </p>
      </SectionCard>

      <SectionCard title="Logs de alterações" description="Últimas 15 ações registradas no sistema">
        {logs.length === 0 ? (
          <p className="text-xs font-medium text-ink/45">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]">
                <div>
                  <span className="badge bg-cloud text-ink/60">{log.action}</span>{" "}
                  <span className="font-bold">{log.entity}</span>
                  {log.entity_id ? <span className="text-ink/40"> #{log.entity_id}</span> : null}
                  {log.details ? <p className="mt-0.5 text-[11px] font-medium text-ink/45">{log.details}</p> : null}
                </div>
                <span className="text-[11px] font-semibold text-ink/35">{dateTimeBR(log.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
