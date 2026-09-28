import type { Metadata } from "next";
import { bodySans, display, mono, pixel } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "p99",
  description: "One production incident a day. Diagnose the system, not the algorithm.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodySans.variable} ${display.variable} ${pixel.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
