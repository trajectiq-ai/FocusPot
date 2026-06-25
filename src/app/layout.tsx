import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FocusPot — Team Deep Work Competitions",
  description:
    "FocusPot turns distraction-free deep work into a fun, team-based competition. Companies set weekly challenges with prizes. Employees track focus hours. Winning teams win.",
  keywords: ["FocusPot", "deep work", "team competition", "productivity", "focus timer", "B2B SaaS"],
  authors: [{ name: "FocusPot" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
