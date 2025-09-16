import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Same Game - 2147483648",
  description: "Same game-like puzzle game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
