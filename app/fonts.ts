import { Geist, Geist_Mono, Geist_Pixel, Space_Grotesk } from "next/font/google";

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

// Geist Pixel's ELSH axis has no published override metrics, so no automatic
// fallback font is generated. The role renders a single short wordmark, where
// the CLS benefit would be negligible. Turbopack still prints a cosmetic
// "Failed to find font override values" warning; it is expected and harmless.
export const pixel = Geist_Pixel({
  subsets: ["latin"],
  variable: "--font-pixel-face",
  display: "swap",
  adjustFontFallback: false,
});

export const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});
