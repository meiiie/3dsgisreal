import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./surfaces.css";
import "./operator-surfaces.css";
import "./viewer.css";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Lối Vào",
  description: "Bản đồ địa điểm và không gian 3D độc lập cho Việt Nam.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
