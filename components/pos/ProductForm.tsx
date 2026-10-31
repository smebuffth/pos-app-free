"use client";

import { useActionState } from "react";
import { saveProductAction } from "@/app/actions/catalog";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/pos/catalog";

type Category = { id: string; name: string };

// The product form. Prices are typed in baht and sent in satang. Stock is changed on the stock page, not here.
export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="sku">รหัสสินค้า (SKU)</Label>
        <Input id="sku" name="sku" required maxLength={40} defaultValue={product?.sku ?? ""} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="barcode">บาร์โค้ด (ถ้ามี)</Label>
        <Input id="barcode" name="barcode" maxLength={64} inputMode="numeric" defaultValue={product?.barcode ?? ""} className="h-11" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">ชื่อสินค้า</Label>
        <Input id="name" name="name" required maxLength={120} defaultValue={product?.name ?? ""} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">หมวดหมู่</Label>
        <Autocomplete
          id="categoryId"
          name="categoryId"
          label="หมวดหมู่"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={product?.categoryId ?? ""}
          placeholder="พิมพ์เพื่อค้นหาหมวดหมู่"
          emptyText="ยังไม่มีหมวดหมู่ เพิ่มได้ที่หน้าหมวดหมู่"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit">หน่วยนับ</Label>
        <Input id="unit" name="unit" required maxLength={20} defaultValue={product?.unit ?? "ชิ้น"} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priceBaht">ราคาขาย (บาท, รวม VAT)</Label>
        <Input id="priceBaht" name="priceBaht" inputMode="decimal" required defaultValue={product ? (product.priceSatang / 100).toFixed(2) : ""} className="h-11 text-right tabular-nums" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="costBaht">ต้นทุน (บาท)</Label>
        <Input id="costBaht" name="costBaht" inputMode="decimal" defaultValue={product ? (product.costSatang / 100).toFixed(2) : "0"} className="h-11 text-right tabular-nums" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lowStockThreshold">แจ้งเตือนเมื่อเหลือ (ชิ้น)</Label>
        <Input id="lowStockThreshold" name="lowStockThreshold" inputMode="numeric" defaultValue={product?.lowStockThreshold ?? 5} className="h-11 text-right tabular-nums" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="active">สถานะ</Label>
        <Autocomplete
          id="active"
          name="active"
          label="สถานะ"
          searchable={false}
          options={[
            { value: "1", label: "ขายอยู่" },
            { value: "0", label: "ซ่อน (เก็บประวัติไว้)" },
          ]}
          defaultValue={product?.active === false ? "0" : "1"}
        />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          บันทึกแล้ว
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="h-12 px-8" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกสินค้า"}
        </Button>
      </div>
    </form>
  );
}
