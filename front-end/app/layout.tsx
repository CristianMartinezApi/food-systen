import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Food System",
  description: "Multi-tenant food ordering system",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/foodsystem-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/foodsystem-icon-512.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
