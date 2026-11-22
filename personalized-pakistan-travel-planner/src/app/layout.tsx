import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rāh — Pakistan, on your terms",
  description: "A thoughtful Pakistan holiday planner. Explore destinations by mood and budget, compare car, motorcycle, coach and flight estimates, then check live routes, weather and OGRA fuel prices.",
  applicationName: "Rāh Pakistan",
  openGraph: {
    title: "Rāh — Find your kind of Pakistan",
    description: "Good roads, tiny detours and honest-ish trip budgets. Find your kind of escape across Pakistan.",
    type: "website",
    locale: "en_PK",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
