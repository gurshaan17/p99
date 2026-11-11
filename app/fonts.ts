import localFont from "next/font/local";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

/**
 * Font roles — DESIGN.md section 4.1.
 *
 * Each loader exposes only a CSS variable; the family itself is applied through
 * the `--font-*` theme names in `globals.css`, so components use `font-display`,
 * `font-pixel`, etc. rather than these objects.
 */

export const bodySans = Geist({
  subsets: ["latin"],
  variable: "--font-body-sans",
  display: "swap",
});

export const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

// Bundle the same Latin font used by the wordmark locally. This bypasses the
// Google loader's missing fallback metrics while preserving the pixel face.
export const pixel = localFont({
  src: "./font-assets/geist-pixel-latin.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-pixel-face",
  display: "swap",
  adjustFontFallback: false,
});

export const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});
