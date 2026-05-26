import type { Metadata, Viewport } from "next";
import "./globals.css";

import Providers from "@/components/Providers";
import AppFooter from "@/components/AppFooter";
import { getServerLocale } from "@/lib/serverI18n";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // necessário para env(safe-area-inset-*) no iPhone
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: {
    default: "Alfred",
    template: "%s — Alfred",
  },
  description: "Seu mordomo financeiro pessoal — elegância e controle ao seu dispor.",
  manifest: "/manifest.json",
  // Padrão moderno (Chrome); appleWebApp continua para Safari / iOS
  other: {
    "mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // faz a status bar do iPhone ser transparente
    title: "Alfred",
  },
  icons: {
    icon: "/apple-icon.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const htmlLang = locale === "en" ? "en" : "pt-BR";

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
