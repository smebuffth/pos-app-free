"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EXAMPLES = ["วันนี้ขายได้เท่าไหร่ และเป็นเงินสดกี่บาท", "สินค้าไหนขายดีที่สุดในสัปดาห์นี้", "มีอะไรที่ควรสั่งเพิ่มบ้าง"];

// The question goes to the server. The answer is text; nothing in the store is changed by it.
export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; settings: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: clean }),
      });
      const body = (await res.json()) as { ok: boolean; data?: { answer: string }; error?: { code: string; message: string } };
      if (body.ok && body.data) setAnswer(body.data.answer);
      else setError({ text: body.error?.message ?? "ถามไม่สำเร็จ ลองใหม่อีกครั้ง", settings: body.error?.code === "ai_off" });
    } catch {
      setError({ text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง", settings: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary-text" aria-hidden />
          ถามเรื่องร้าน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="space-y-3"
        >
          <Label htmlFor="ask-question">คำถาม</Label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="พิมพ์คำถามเป็นภาษาไทย"
            className="w-full rounded-xl border border-input bg-bg p-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} type="button" onClick={() => setQuestion(e)} className="min-h-9 rounded-full border border-border px-3 text-xs text-fg hover:bg-tint">
                {e}
              </button>
            ))}
          </div>
          <Button type="submit" className="h-11" disabled={busy || question.trim() === ""}>
            {busy ? "กำลังคิดคำตอบ…" : "ถาม"}
          </Button>
        </form>

        {answer ? (
          <div role="status" className="space-y-2 rounded-xl bg-tint p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{answer}</p>
            <p className="text-xs text-subtle">คำตอบนี้มาจากข้อมูลในระบบ ตรวจตัวเลขก่อนตัดสินใจทุกครั้ง</p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.text}
            {error.settings ? (
              <>
                {" "}
                <Link href="/account/ai" className="underline">
                  ไปที่ เชื่อมต่อ AI
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
