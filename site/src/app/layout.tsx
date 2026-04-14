import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arch-Engine",
  description: "A topology reasoning runtime for architecture governance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
