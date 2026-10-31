import Image from "next/image";
import { cn } from "@/lib/utils";

// The logo with the product name, used by the landing page, the sign-in pages and the app sidebar.
// The image is decorative: the name next to it is the accessible text.
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image src="/logo/logo-mark.png" alt="" width={size} height={size} className="rounded-lg" priority />
      <span className="text-base font-semibold tracking-tight text-fg">Nisia POS</span>
    </span>
  );
}
