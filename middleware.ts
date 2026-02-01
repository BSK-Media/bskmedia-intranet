import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function getUserFromRequest(req: NextRequest): Promise<{ role?: string; email?: string } | null> {
  const token = req.cookies.get("bsk_auth")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { role: payload.role as string | undefined, email: payload.email as string | undefined };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/api");

  if (!needsAuth) return NextResponse.next();

  // allow auth endpoints without session
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const user = await getUserFromRequest(req);
  if (!user?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Always land on the app's role-based home redirect after logging in.
    // This avoids getting "stuck" inside admin sub-routes after session expiry.
    url.searchParams.set("next", "/");
    return NextResponse.redirect(url);
  }

  const role = user.role;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/me", req.url));
  }

  // Allow admins to open the employee panel when impersonating.
  const isImpersonating = !!req.cookies.get("bsk_impersonate")?.value;
  if (pathname.startsWith("/me") && role === "ADMIN" && !isImpersonating) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
