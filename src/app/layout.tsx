import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FVBIAN — Apex Playground",
  description:
    "A modern web playground. Vision of an eagle, speed of a cheetah, instinct of a lemur.",
  metadataBase: new URL("https://fvbian.com"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
