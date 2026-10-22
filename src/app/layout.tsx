import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { BannerInstalar } from "@/components/InstalarSello";
import ficha from "../../ficha.json";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// Sin preload: solo la usan etiquetas y datos pequeños.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  preload: false,
});

export const metadata: Metadata = {
  title: ficha.nombre,
  description: ficha.frase,
  // Experimental: que no aparezca en buscadores como si fuera un servicio oficial.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Sello", statusBarStyle: "default" },
  icons: {
    icon: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_PATH}/icon-192.png`,
        type: "image/png",
        sizes: "192x192",
      },
    ],
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH}/apple-touch-icon.png`,
  },
};

// Barra del sistema en blanco, como el fondo de la app (Sol, sin modo oscuro).
// El link rel=manifest lo añade Next solo por existir src/app/manifest.ts.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <a
          href="#contenido"
          className="fixed top-2 left-2 z-50 inline-flex min-h-11 -translate-y-[calc(100%+16px)] items-center rounded-xl bg-foreground px-4 text-[15px] font-medium text-background focus-visible:translate-y-0"
        >
          Saltar al contenido
        </a>
        <p
          role="note"
          className="bg-muted px-(--page-gutter) py-2 text-center text-sm text-(--text-secondary)"
        >
          Herramienta experimental. No es un servicio oficial.
        </p>
        {children}
        <BannerInstalar />
      </body>
    </html>
  );
}
