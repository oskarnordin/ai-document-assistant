import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Document & Knowledge Assistant",
  description: "Chatta med dina PDF-dokument med hjälp av AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={`${roboto.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-muted/40">{children}</body>
    </html>
  );
}
