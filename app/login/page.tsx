"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const sp = useSearchParams();
  const router = useRouter();
  const from = sp.get("from") ?? "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);

    if (!res.ok) return toast.error("Nieprawidłowy email lub hasło");
    router.replace(from);
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto mt-16 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Logowanie</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Hasło</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Logowanie…" : "Zaloguj"}
              </Button>

              <div className="pt-4 text-xs text-zinc-500">
                Seed konta:
                <ul className="mt-1 list-disc pl-5">
                  <li>ADMIN: b.skladanek@bskmedia.pl / C3bee3ae!@#$</li>
                  <li>EMPLOYEE: o.tomaszek@bskmedia.pl / Olaf123!</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
