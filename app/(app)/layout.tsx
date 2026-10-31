import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { getStoreSettings } from "@/lib/pos/settings";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { OutboxFlusher } from "@/components/pos/OutboxFlusher";

// The session is read on every request, so this segment blocks on the server instead of prerendering.
export const instant = false;

// Every page under (app) is signed in. Each page still checks its own role.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const settings = await withDb((db) => getStoreSettings(db));
  return (
    <>
      <AppShell user={user} storeName={settings.name}>
        {children}
      </AppShell>
      <OutboxFlusher />
      <Toaster />
    </>
  );
}
