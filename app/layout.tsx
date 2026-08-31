import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Monthlane",
    template: "%s · Monthlane",
  },
  description: "Plan life, one month at a time. A calm, local-first personal calendar.",
  applicationName: "Monthlane",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Monthlane",
  },
  icons: {
    icon: [
      { url: "/monthlane-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/monthlane-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/monthlane-icon-192.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
