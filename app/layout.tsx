import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FishFarm Management",
  description: "Mobile-first aquaculture farm management system",
  applicationName: "FishFarm Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
