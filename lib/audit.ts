import type { Db } from "@/lib/db";
import { newId } from "@/lib/ids";

// Records who did what. The detail holds business values only: never a password, token, key or raw personal data.
export async function audit(
  db: Db,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await db.query(
    "INSERT INTO audit_log (id, actor_id, action, entity, entity_id, detail, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [newId(), actorId, action, entity, entityId, JSON.stringify(detail), new Date()],
  );
}
