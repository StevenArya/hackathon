import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "InVora | Credit Overview",
  description: "Monitor receivables, customer risk, and upcoming payments in your credit management workspace.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className="h-full antialiased"><body className="min-h-full">{children}</body></html>;
}
