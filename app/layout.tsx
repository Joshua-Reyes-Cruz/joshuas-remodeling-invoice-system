import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joshua's Remodeling Invoice System",
  description: "Manage remodeling jobs, invoices, signed change orders, and customer documents in one place.",
  icons: {
    icon: "/joshuas-remodeling-logo.png",
    shortcut: "/joshuas-remodeling-logo.png",
  },
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
