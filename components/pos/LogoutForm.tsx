"use client";

import { useRef } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

// Signing out clears the cached counter and home pages on this device, so the next person cannot open them offline.
// The queued offline sales are kept: they belong to the store, and they are sent at the next sync.
export function LogoutForm() {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={logoutAction}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await caches.delete("pages");
        } catch {
          // Cache storage can be unavailable. Signing out still goes ahead.
        }
        formRef.current?.requestSubmit();
      }}
      className="pt-2"
    >
      <Button type="submit" variant="outline" className="h-12 w-full text-base">
        ออกจากระบบ
      </Button>
    </form>
  );
}
