import type { MetadataRoute } from "next";

// The icons are the derivatives of public/logo/logo-mark.png. The maskable icon is a separate, opaque composition.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nisia POS",
    short_name: "Nisia POS",
    description: "ระบบขายหน้าร้านสำหรับร้านค้า ขายต่อได้แม้ไม่มีอินเทอร์เน็ต",
    // The tag sends a signed-out user to sign-in rather than the landing page. See app/page.tsx.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f5f8ff",
    theme_color: "#1d4ed8",
    lang: "th",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
