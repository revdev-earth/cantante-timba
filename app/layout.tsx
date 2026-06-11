import type { Metadata } from "next";
import "@fontsource/anton/400.css";
import "@fontsource/shrikhand/400.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timba Cantante — tu cantante de rueda",
  description:
    "Cuenta 1·2·3, 5·6·7 como una canción de timba y canta las figuras de la rueda de casino en el tres.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="font-body min-h-full antialiased">{children}</body>
    </html>
  );
}
