import { z } from "zod";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";
import { requireManagerApi } from "@/lib/auth/guards";
import { bangkokRange, isYmd } from "@/lib/time";

// CSV of the sales in a date range (Asia/Bangkok, inclusive). Managers and owners only.
export async function GET(request: Request) {
  return handle(async () => {
    await connection();
    await requireManagerApi();
    const url = new URL(request.url);
    const parsed = z
      .object({ from: z.string().refine(isYmd), to: z.string().refine(isYmd) })
      .safeParse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    if (!parsed.success) throw new HttpError(400, "validation_error", "ระบุช่วงวันที่ให้ถูกต้อง");
    const { start, end } = bangkokRange(parsed.data.from, parsed.data.to);

    const rows = await withDb(async (db) => {
      const { rows } = await db.query<{
        receipt_no: string;
        created_at: Date;
        cashier: string;
        status: string;
        payment_method: string;
        subtotal_satang: number;
        discount_satang: number;
        vat_satang: number;
        total_satang: number;
        offline: number;
      }>(
        `SELECT s.receipt_no, s.created_at, u.name AS cashier, s.status, s.payment_method, s.subtotal_satang,
                s.discount_satang, s.vat_satang, s.total_satang, s.offline
           FROM sales s JOIN users u ON u.id = s.cashier_id
          WHERE s.created_at >= $1 AND s.created_at < $2
          ORDER BY s.created_at`,
        [start, end],
      );
      return rows;
    });

    const baht = (satang: number) => (satang / 100).toFixed(2);
    const esc = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
    const header = ["เลขที่ใบเสร็จ", "วันเวลา", "พนักงาน", "สถานะ", "วิธีชำระ", "ยอดก่อนส่วนลด", "ส่วนลด", "VAT", "ยอดสุทธิ", "ออฟไลน์"];
    const lines = rows.map((r) =>
      [
        r.receipt_no,
        new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" }).format(new Date(r.created_at)),
        r.cashier,
        r.status === "voided" ? "ยกเลิก" : "สำเร็จ",
        r.payment_method,
        baht(r.subtotal_satang),
        baht(r.discount_satang),
        baht(r.vat_satang),
        baht(r.total_satang),
        r.offline ? "ใช่" : "",
      ]
        .map(esc)
        .join(","),
    );
    const body = `﻿${[header.join(","), ...lines].join("\n")}\n`;
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="sales-${parsed.data.from}-${parsed.data.to}.csv"`,
        "cache-control": "no-store",
      },
    });
  });
}
