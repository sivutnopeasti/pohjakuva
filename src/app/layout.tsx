import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pohjakuva – Automaattinen brändäys",
  description: "Kiinteistövälittäjän pohjakuvan automaattinen brändäystyökalu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
