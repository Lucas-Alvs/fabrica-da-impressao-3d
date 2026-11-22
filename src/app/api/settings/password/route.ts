import { changePassword, isAuthenticated, unauthorized } from "@/lib/auth";
import { logAction } from "@/lib/db";

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
  };

  if (!body.current_password || !body.new_password) {
    return Response.json({ error: "Preencha todas as senhas." }, { status: 400 });
  }
  if (body.new_password !== body.confirm_password) {
    return Response.json({ error: "A confirmação não corresponde à nova senha." }, { status: 400 });
  }

  const result = await changePassword(body.current_password, body.new_password);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  await logAction("update", "password", null, "Senha administrativa alterada");
  return Response.json({ ok: true });
}
