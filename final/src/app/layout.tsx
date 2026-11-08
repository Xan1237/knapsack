import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Knapsack — see what fits before you pack",
  description:
    "Turn your belongings into an editable 3D packing plan and see what fits in your suitcase before you pack.",
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
