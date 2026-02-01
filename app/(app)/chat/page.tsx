"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ChatPage() {
  const { user } = useAuth();
  const meId = user?.id;

  const { data: convs } = useSWR("/api/chat/conversations", fetcher, { refreshInterval: 5000 });
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeId && convs?.[0]?.id) setActiveId(convs[0].id);
  }, [convs, activeId]);

  const { data: messages, mutate } = useSWR(activeId ? `/api/chat/messages?conversationId=${activeId}` : null, fetcher, { refreshInterval: 2500 });
  const [text, setText] = React.useState("");

  async function send() {
    if (!activeId || !text.trim()) return;
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, text }),
    });
    if (res.ok) {
      setText("");
      mutate();
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Konwersacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(convs ?? []).map((c: any) => (
            <button
              key={c.id}
              className={cn(
                "w-full rounded-xl border border-zinc-200 p-3 text-left text-sm dark:border-zinc-800",
                c.id === activeId && "bg-zinc-100 dark:bg-zinc-900",
              )}
              onClick={() => setActiveId(c.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{c.name ?? (c.type === "DIRECT" ? "Rozmowa" : "Grupa")}</div>
                {!!c.unreadCount && <div className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-black">{c.unreadCount}</div>}
              </div>
              <div className="text-xs text-zinc-500">{c.lastMessage?.body ?? "—"}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Wiadomości</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[60vh] flex-1 flex-col justify-between gap-3">
          <div className="space-y-2">
            {(messages ?? []).map((m: any) => {
              const mine = meId && m.senderId === meId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl border border-zinc-200 p-3 text-sm dark:border-zinc-800",
                    mine ? "ml-auto bg-zinc-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-950",
                  )}
                >
                  <div className="text-xs text-zinc-500">
                    {m.sender?.name ?? "User"} · {String(m.createdAt).slice(11, 16)}
                  </div>
                  <div>{m.body}</div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Napisz wiadomość…"
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <Button onClick={send}>Wyślij</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
