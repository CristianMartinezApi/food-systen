import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Food System",
  description: "Multi-tenant food ordering system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <Script
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCV4EcVeyozyk9VHH7XFhFuLXU4fS7Gjds&libraries=places"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
