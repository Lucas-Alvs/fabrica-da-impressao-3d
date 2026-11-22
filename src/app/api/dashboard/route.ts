import { isAuthenticated, unauthorized } from "@/lib/auth";
import { getDashboard } from "@/lib/repo";

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();
  return Response.json(await getDashboard());
}
