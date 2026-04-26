import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";
import { QueryProvider } from "@/components/query-provider";
import { SupabaseProvider } from "@/components/supabase-provider";
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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-screen min-w-0 flex-col font-sans antialiased">
        <QueryProvider>
          <SupabaseProvider>
            <TooltipProvider>
              <Nav />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <PageTransition>{children}</PageTransition>
              </div>
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
          </SupabaseProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
