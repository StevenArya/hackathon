import type { Metadata } from "next";
import { Manrope, Oswald } from "next/font/google";
import "./globals.css";

// Variable sans-serif with a rounded, geometric feel across all pages.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-invora", display: "swap" });
const headingFont = Oswald({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
export const metadata: Metadata = {
  title: "InVora | Credit Overview",
  description: "Monitor receivables, customer risk, and upcoming payments in your credit management workspace.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${manrope.variable} ${headingFont.variable} h-full antialiased`}><body className="min-h-full">{children}</body></html>;
}
