import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Alfred Financeiro",
  description: "Seu mordomo financeiro pessoal — elegância e controle ao seu dispor.",
  manifest: "/manifest.json",
  icons: {
    icon: "/apple-icon.svg",
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
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
