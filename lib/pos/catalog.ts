import type { Db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

export type Category = { id: string; name: string; sortOrder: number; active: boolean };

export type Product = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  priceSatang: number;
  costSatang: number;
  stockQty: number;
  lowStockThreshold: number;
  imageKey: string | null;
  active: boolean;
};

export type ProductInput = Omit<Product, "id" | "categoryName" | "stockQty" | "active" | "imageKey"> & { active: boolean };

const PRODUCT_COLUMNS = `p.id, p.category_id, c.name AS category_name, p.sku, p.barcode, p.name, p.unit,
  p.price_satang, p.cost_satang, p.stock_qty, p.low_stock_threshold, p.image_key, p.active`;

type ProductRow = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  price_satang: number;
  cost_satang: number;
  stock_qty: number;
  low_stock_threshold: number;
  image_key: string | null;
  active: number;
};

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  categoryId: r.category_id,
  categoryName: r.category_name,
  sku: r.sku,
  barcode: r.barcode,
  name: r.name,
  unit: r.unit,
  priceSatang: r.price_satang,
  costSatang: r.cost_satang,
  stockQty: r.stock_qty,
  lowStockThreshold: r.low_stock_threshold,
  imageKey: r.image_key,
  active: r.active === 1,
});

export async function listCategories(db: Db, activeOnly = true): Promise<Category[]> {
  const { rows } = await db.query<{ id: string; name: string; sort_order: number; active: number }>(
    `SELECT id, name, sort_order, active FROM categories ${activeOnly ? "WHERE active = 1" : ""} ORDER BY sort_order, name`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order, active: r.active === 1 }));
}

export async function listProducts(
  db: Db,
  opts: { q?: string; categoryId?: string; activeOnly?: boolean; lowStockOnly?: boolean; limit?: number } = {},
): Promise<Product[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.activeOnly !== false) where.push("p.active = 1");
  if (opts.categoryId) {
    params.push(opts.categoryId);
    where.push(`p.category_id = $${params.length}`);
  }
  if (opts.lowStockOnly) where.push("p.stock_qty <= p.low_stock_threshold");
  if (opts.q) {
    const like = `%${opts.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like, like);
    where.push(`(LOWER(p.name) LIKE $${params.length - 2} OR LOWER(p.sku) LIKE $${params.length - 1} OR LOWER(p.barcode) LIKE $${params.length})`);
  }
  params.push(opts.limit ?? 200);
  const { rows } = await db.query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p LEFT JOIN categories c ON c.id = p.category_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.name LIMIT $${params.length}`,
    params,
  );
  return rows.map(toProduct);
}

export async function getProduct(db: Db, id: string): Promise<Product | null> {
  const { rows } = await db.query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [id],
  );
  return rows[0] ? toProduct(rows[0]) : null;
}

export async function findByBarcodeOrSku(db: Db, code: string): Promise<Product | null> {
  const { rows } = await db.query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE (p.barcode = $1 OR p.sku = $1) AND p.active = 1`,
    [code],
  );
  return rows[0] ? toProduct(rows[0]) : null;
}

// A product cannot be deleted once it has sales. It is archived (active = 0) instead.
export async function createProduct(db: Db, actorId: string, input: ProductInput): Promise<string> {
  const id = newId();
  try {
    await db.query(
      `INSERT INTO products (id, category_id, sku, barcode, name, unit, price_satang, cost_satang, stock_qty,
         low_stock_threshold, image_key, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, NULL, $10, $11, $11)`,
      [
        id,
        input.categoryId,
        input.sku,
        input.barcode,
        input.name,
        input.unit,
        input.priceSatang,
        input.costSatang,
        input.lowStockThreshold,
        input.active ? 1 : 0,
        new Date(),
      ],
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new DuplicateCode();
    throw err;
  }
  await audit(db, actorId, "product.create", "product", id, { sku: input.sku, priceSatang: input.priceSatang });
  return id;
}

export async function updateProduct(db: Db, actorId: string, id: string, input: ProductInput): Promise<void> {
  const before = await getProduct(db, id);
  if (!before) throw new NotFound();
  try {
    await db.query(
      `UPDATE products SET category_id = $2, sku = $3, barcode = $4, name = $5, unit = $6, price_satang = $7,
         cost_satang = $8, low_stock_threshold = $9, active = $10, updated_at = $11
       WHERE id = $1`,
      [
        id,
        input.categoryId,
        input.sku,
        input.barcode,
        input.name,
        input.unit,
        input.priceSatang,
        input.costSatang,
        input.lowStockThreshold,
        input.active ? 1 : 0,
        new Date(),
      ],
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new DuplicateCode();
    throw err;
  }
  if (before.priceSatang !== input.priceSatang) {
    await audit(db, actorId, "product.price_change", "product", id, {
      fromSatang: before.priceSatang,
      toSatang: input.priceSatang,
    });
  }
}

export async function saveCategory(db: Db, id: string | null, name: string, sortOrder: number, active: boolean) {
  if (id) {
    await db.query("UPDATE categories SET name = $2, sort_order = $3, active = $4 WHERE id = $1", [
      id,
      name,
      sortOrder,
      active ? 1 : 0,
    ]);
    return id;
  }
  const newCategoryId = newId();
  await db.query("INSERT INTO categories (id, name, sort_order, active, created_at) VALUES ($1, $2, $3, 1, $4)", [
    newCategoryId,
    name,
    sortOrder,
    new Date(),
  ]);
  return newCategoryId;
}

export class DuplicateCode extends Error {}
export class NotFound extends Error {}
