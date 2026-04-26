import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";
import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maarg — Verified Healthcare Intelligence",
  description:
    "The agentic map to verified healthcare. Maarg audits every Indian facility claim with citation-backed trust scores, calibrated confidence intervals, and live contradiction detection — because when finding the path saves a life, you can't afford to guess.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <TooltipProvider>
            <Nav />
            <PageTransition>{children}</PageTransition>
            <Toaster
              theme="system"
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  fontFamily: "var(--font-sans)",
                  borderRadius: "14px",
                },
              }}
            />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
