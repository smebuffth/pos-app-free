import { z } from "zod";

// Money in satang: a non-negative whole number, capped at 10 million baht.
export const satang = z.number().int().min(0).max(1_000_000_000);
export const id = z.string().min(1).max(64);
export const qty = z.number().int().min(1).max(999);
export const text = (max: number) => z.string().trim().max(max);
