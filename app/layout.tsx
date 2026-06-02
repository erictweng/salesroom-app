// Root layout: wraps every route with the base <html>/<body> and global styles.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salesroom",
  description: "Digital Sales Room — curate content, attribute buyer engagement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
