import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteção de rotas: sem o cookie de sessão o usuário é levado ao login.
 * A validação criptográfica do cookie é feita no servidor (lib/auth),
 * esta camada apenas evita renderizar o painel sem sessão.
 */
const PROTECTED = [
  "/dashboard",
  "/clientes",
  "/materiais",
  "/orcamentos",
  "/configuracoes"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("fabrica_session")?.value);

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected = PROTECTED.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Runtime Node.js: exigido em produção por alguns alvos de deploy
  // (o runtime Edge do middleware está sendo descontinuado).
  runtime: "nodejs",
  matcher: ["/dashboard/:path*", "/clientes/:path*", "/materiais/:path*", "/orcamentos/:path*", "/configuracoes/:path*", "/login"]
};
