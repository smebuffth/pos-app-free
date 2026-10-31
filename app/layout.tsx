import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anuphan } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { Providers } from "@/app/providers";
import "./globals.css";

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-anuphan",
  display: "swap",
});

// An internal point-of-sale app: not for search engines.
export const metadata: Metadata = {
  title: { default: "Nisia POS", template: "%s · Nisia POS" },
  description: "ระบบขายหน้าร้าน (POS) สำหรับร้านค้า",
  applicationName: "Nisia POS",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={`${anuphan.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
