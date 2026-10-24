import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Knapsack — a little room for everything",
  description:
    "Turn your belongings into an editable 3D packing plan. See your suitcase packed before you start.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
