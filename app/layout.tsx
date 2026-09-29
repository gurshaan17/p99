import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { bodySans, display, mono, pixel } from "./fonts";
import { Frame } from "@/components/shell/frame";
import { site } from "@/lib/site";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "p99",
  description: site.description,
  // Autodiscovery, so a reader can find the feed without the topbar link. The
  // `alternates` form is what Next turns into `<link rel="alternate">`; browsers
  // and feed readers both look for it before anything visible on the page.
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodySans.variable} ${display.variable} ${pixel.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-page text-ink-2">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <Frame>
            <Sidebar />
            <div className="flex min-w-0 flex-col">
              <Topbar />
              <main className="flex-1 px-(--pad-x) py-(--pad-y)">{children}</main>
            </div>
          </Frame>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
