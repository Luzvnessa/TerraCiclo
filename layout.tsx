import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraCiclo | Agricultura resiliente",
  description: "Plataforma demostrativa para comparar alternativas de rotación de cultivos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
