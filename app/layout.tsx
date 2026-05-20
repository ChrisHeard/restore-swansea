import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";

export const metadata = {
  title: "Restore Swansea",
  description: "Membership platform for Restore Swansea. Organise leafletting and canvassing routes, manage volunteers, and more.",
  appleWebApp: {
    capable: true,
    title: "Restore Swansea",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
