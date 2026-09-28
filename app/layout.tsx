import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { bodySans, display, mono, pixel } from "./fonts";
import { Frame } from "@/components/shell/frame";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "p99",
  description: "One production incident a day. Diagnose the system, not the algorithm.",
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
              <main className="flex-1">{children}</main>
            </div>
          </Frame>
        </ThemeProvider>
      </body>
    </html>
  );
}
