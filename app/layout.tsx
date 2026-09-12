import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Variable sans-serif with a rounded, geometric feel across all pages.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-invora", display: "swap" });
export const metadata: Metadata = {
  title: "InVora | Credit Overview",
  description: "Monitor receivables, customer risk, and upcoming payments in your credit management workspace.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${manrope.variable} h-full antialiased`}><body className="min-h-full">{children}</body></html>;
}
