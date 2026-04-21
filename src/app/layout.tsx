import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MediCity - Healthcare Intelligence Platform",
  description: "AI-Powered Search & Triage Engine for optimal healthcare routing and macro-analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col`}>
        <Navbar />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Ambient Background Effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-accent/10 blur-[150px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
          {children}
        </main>
      </body>
    </html>
  );
}
