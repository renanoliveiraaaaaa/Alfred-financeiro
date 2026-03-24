import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // necessário para env(safe-area-inset-*) no iPhone
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: "Alfred Financeiro",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
