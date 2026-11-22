import { isAuthenticated } from "@/lib/auth";
import { logAction } from "@/lib/db";
import { exportBackup } from "@/lib/repo";

/** Backup completo do banco em JSON (sem o hash da senha). */
export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const backup = await exportBackup();
  await logAction("backup", "database", null, "Backup exportado");

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-fabrica-3d-${date}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
