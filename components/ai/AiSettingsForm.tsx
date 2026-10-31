"use client";

import { useActionState, useState } from "react";
import { removeAiKeyAction, saveAiSettingsAction } from "@/app/actions/ai";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLAUDE_MODELS, PROVIDERS, PROVIDER_LABEL, type Provider } from "@/lib/ai/constants";
import type { AiSettingsView } from "@/lib/ai/settings";

type Props = { initial: AiSettingsView };

// Write-only key: the field is always empty; the saved key is shown only by its last four characters.
export function AiSettingsForm({ initial }: Props) {
  const [state, action, pending] = useActionState(saveAiSettingsAction, undefined);
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [models, setModels] = useState<string[]>(provider === "anthropic" ? [...CLAUDE_MODELS] : []);
  const [busy, setBusy] = useState<"models" | "test" | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const call = async (kind: "models" | "test") => {
    setBusy(kind);
    setNote(null);
    try {
      const res = kind === "models" ? await fetch("/api/ai/models", { cache: "no-store" }) : await fetch("/api/ai/settings/test", { method: "POST" });
      const body = (await res.json()) as { ok: boolean; data?: { models?: string[]; model?: string }; error?: { message: string } };
      if (!body.ok) return setNote({ ok: false, text: body.error?.message ?? "ทำรายการไม่สำเร็จ" });
      if (kind === "models") {
        setModels(body.data?.models ?? []);
        setNote({ ok: true, text: `พบ ${body.data?.models?.length ?? 0} โมเดล` });
      } else {
        setNote({ ok: true, text: `เชื่อมต่อสำเร็จ กับโมเดล ${body.data?.model ?? model}` });
      }
    } catch {
      setNote({ ok: false, text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {!initial.encryptionReady ? (
        <p role="alert" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
          ระบบยังไม่ได้ตั้งค่าการเข้ารหัสคีย์ (APP_ENCRYPTION_KEY) จึงบันทึกคีย์ไม่ได้
        </p>
      ) : null}

      <form action={action} className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ai-provider">ผู้ให้บริการ</Label>
          <Autocomplete
            id="ai-provider"
            name="provider"
            label="ผู้ให้บริการ AI"
            searchable={false}
            options={PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))}
            defaultValue={initial.provider}
            onPick={(value) => setProvider(value as Provider)}
          />
        </div>

        {provider === "custom" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="ai-format">รูปแบบการเรียก</Label>
              <Autocomplete
                id="ai-format"
                name="apiFormat"
                label="รูปแบบการเรียก"
                searchable={false}
                options={[
                  { value: "openai", label: "OpenAI-compatible (/v1/chat/completions)" },
                  { value: "anthropic", label: "Anthropic-compatible (/v1/messages)" },
                ]}
                defaultValue={initial.apiFormat}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-base">URL ของผู้ให้บริการ</Label>
              <Input id="ai-base" name="baseUrl" type="url" defaultValue={initial.baseUrl} placeholder="https://… หรือ http://localhost:…" className="h-11" />
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="apiFormat" value="openai" />
            <input type="hidden" name="baseUrl" value="" />
          </>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ai-model">โมเดล</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="ai-model" name="model" value={model} onChange={(e) => setModel(e.target.value)} maxLength={120} placeholder="เช่น claude-sonnet-5-5" className="h-11 flex-1" />
            <Button type="button" variant="outline" className="h-11" disabled={busy !== null} onClick={() => call("models")}>
              {busy === "models" ? "กำลังดึง…" : "ดึงรายการโมเดล"}
            </Button>
          </div>
          {models.length > 0 ? (
            <ul aria-label="โมเดลที่แนะนำ" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pt-1">
              {models.slice(0, 60).map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => setModel(m)}
                    className={`min-h-9 rounded-full border px-3 text-xs ${model === m ? "border-primary bg-primary/10 text-primary-text" : "border-border text-fg hover:bg-tint"}`}
                  >
                    {m}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-key">คีย์ API {initial.hasKey ? `(บันทึกแล้ว ลงท้าย ${initial.keyLast4})` : ""}</Label>
          <Input id="ai-key" name="apiKey" type="password" autoComplete="off" placeholder={initial.hasKey ? "เว้นว่างเพื่อใช้คีย์เดิม" : "วางคีย์ที่นี่"} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-enabled">การใช้งาน</Label>
          <Autocomplete
            id="ai-enabled"
            name="enabled"
            label="การใช้งาน"
            searchable={false}
            options={[
              { value: "1", label: "เปิดใช้งาน" },
              { value: "0", label: "ปิด" },
            ]}
            defaultValue={initial.enabled ? "1" : "0"}
          />
        </div>

        {state && !state.ok ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {state.error.message}
          </p>
        ) : null}
        {state?.ok ? (
          <p role="status" className="text-sm text-success sm:col-span-2">
            บันทึกการตั้งค่า AI แล้ว
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
          <Button type="button" variant="outline" className="h-11" disabled={busy !== null || !initial.hasKey} onClick={() => call("test")}>
            {busy === "test" ? "กำลังทดสอบ…" : "ทดสอบการเชื่อมต่อ"}
          </Button>
        </div>
      </form>

      {note ? (
        <p role={note.ok ? "status" : "alert"} className={`text-sm ${note.ok ? "text-success" : "text-destructive"}`}>
          {note.text}
        </p>
      ) : null}

      {initial.hasKey ? (
        <form action={removeAiKeyAction} className="border-t border-border pt-6">
          <p className="mb-3 text-sm text-subtle">การลบคีย์จะปิดการใช้งาน AI ด้วย</p>
          <Button type="submit" variant="ghost" className="h-11 text-destructive">
            ลบคีย์ API
          </Button>
        </form>
      ) : null}
    </div>
  );
}
