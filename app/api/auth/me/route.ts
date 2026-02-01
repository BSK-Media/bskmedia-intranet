import { NextResponse } from "next/server";
import { getEffectiveAuth } from "@/lib/effective-auth";

export async function GET() {
  const { user, adminUser, impersonating } = await getEffectiveAuth();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user, adminUser: impersonating ? adminUser : null, impersonating });
}
