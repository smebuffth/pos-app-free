"use client";

import { useActionState } from "react";
import { saveCategoryAction } from "@/app/actions/catalog";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/pos/catalog";

export function CategoryForms({ categories }: { categories: Category[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {categories.length === 0 ? <li className="px-4 py-6 text-sm text-subtle">ยังไม่มีหมวดหมู่</li> : null}
        {categories.map((c) => (
          <li key={c.id} className="p-4">
            <CategoryRow category={c} />
          </li>
        ))}
      </ul>
      <section aria-labelledby="new-category" className="rounded-2xl border border-border bg-tint p-5">
        <h2 id="new-category" className="mb-4 text-base font-semibold text-fg">
          เพิ่มหมวดหมู่
        </h2>
        <CategoryFormBody />
      </section>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  return <CategoryFormBody category={category} />;
}

function CategoryFormBody({ category }: { category?: Category }) {
  const [state, action, pending] = useActionState(saveCategoryAction, undefined);
  return (
    <form action={action} className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 sm:grid-cols-[minmax(0,1fr)_96px_auto] sm:items-end">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="col-span-2 space-y-2 sm:col-span-1">
        <Label htmlFor={`name-${category?.id ?? "new"}`}>ชื่อหมวดหมู่</Label>
        <Input id={`name-${category?.id ?? "new"}`} name="name" required maxLength={60} defaultValue={category?.name ?? ""} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`sort-${category?.id ?? "new"}`}>ลำดับ</Label>
        <Input id={`sort-${category?.id ?? "new"}`} name="sortOrder" inputMode="numeric" defaultValue={category?.sortOrder ?? 0} className="h-11 text-right" />
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1">
        <Autocomplete
          name="active"
          label="สถานะ"
          searchable={false}
          options={[
            { value: "1", label: "แสดง" },
            { value: "0", label: "ซ่อน" },
          ]}
          defaultValue={category?.active === false ? "0" : "1"}
          className="w-28"
        />
        <Button type="submit" className="h-11" disabled={pending}>
          {category ? "บันทึก" : "เพิ่ม"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="col-span-2 text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
