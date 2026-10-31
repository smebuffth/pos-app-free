"use client";

import { useActionState, useState } from "react";
import { createMcpTokenAction, revokeMcpTokenAction, type CreatedToken } from "@/app/actions/mcp";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type TokenRow = { id: string; name: string; hint: string; expiresAt: string; lastUsedAt: string | null };

function RevokeForm({ tokenId }: { tokenId: string }) {
  const [state, action, pending] = useActionState(revokeMcpTokenAction, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("ยกเลิกโทเคนนี้? แอปที่ใช้โทเคนนี้จะเข้าไม่ได้อีก")) e.preventDefault();
      }}
    >
      <input type="hidden" name="tokenId" value={tokenId} />
      <Button type="submit" variant="ghost" className="h-11 text-destructive" disabled={pending}>
        {pending ? "กำลังยกเลิก…" : "ยกเลิกโทเคน"}
      </Button>
      {state && !state.ok ? <span role="alert" className="text-xs text-destructive">{state.error.message}</span> : null}
    </form>
  );
}

// Tokens are personal and read only. The raw token appears once, here, after it is created.
export function McpTokenPanel({ tokens, endpoint }: { tokens: TokenRow[]; endpoint: string }) {
  const [state, action, pending] = useActionState(createMcpTokenAction, undefined);
  const [copied, setCopied] = useState(false);
  const created: CreatedToken | null = state?.ok ? state.data : null;

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {tokens.length === 0 ? <li className="px-4 py-3 text-sm text-subtle">ยังไม่มีโทเคน</li> : null}
        {tokens.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{t.name}</p>
              <p className="text-xs text-subtle">
                …{t.hint} · หมดอายุ {new Date(t.expiresAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}
                {t.lastUsedAt ? ` · ใช้ล่าสุด ${new Date(t.lastUsedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}` : " · ยังไม่เคยใช้"}
              </p>
            </div>
            <RevokeForm tokenId={t.id} />
          </li>
        ))}
      </ul>

      <form action={action} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="token-name">ชื่อโทเคน</Label>
          <Input id="token-name" name="name" required maxLength={60} placeholder="เช่น Claude Code ที่บ้าน" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-ttl">อายุ</Label>
          <Autocomplete
            id="token-ttl"
            name="ttlDays"
            label="อายุโทเคน"
            searchable={false}
            options={[
              { value: "7", label: "7 วัน" },
              { value: "30", label: "30 วัน" },
              { value: "90", label: "90 วัน" },
            ]}
            defaultValue="30"
          />
        </div>
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "กำลังสร้าง…" : "สร้างโทเคน"}
        </Button>
        {state && !state.ok ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-3">
            {state.error.message}
          </p>
        ) : null}
      </form>

      {created ? (
        <div role="status" className="space-y-4 rounded-xl border border-primary/30 bg-tint p-4">
          <div className="flex items-center gap-2">
            <Badge tone="warning">แสดงครั้งเดียว</Badge>
            <span className="text-sm text-fg">บันทึกโทเคนนี้ไว้ตอนนี้ หน้านี้จะไม่แสดงอีก</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-bg p-3 text-xs text-fg">{created.token}</code>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={async () => {
                await navigator.clipboard?.writeText(created.token);
                setCopied(true);
              }}
            >
              {copied ? "คัดลอกแล้ว" : "คัดลอก"}
            </Button>
          </div>
          <div className="space-y-2 text-xs text-subtle">
            <p>คำสั่งเชื่อมต่อ (Claude Code):</p>
            <code className="block break-all rounded-lg bg-bg p-3 text-fg">
              {`claude mcp add --transport http nisia-pos ${endpoint} --header "Authorization: Bearer ${created.token}"`}
            </code>
            <p>ใช้ได้เฉพาะเครื่องมือแบบอ่านอย่างเดียว และไม่สามารถทำรายการขายหรือแก้สต็อกได้</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
