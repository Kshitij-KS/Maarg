import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description: "Medical deserts, population at risk, and verified facilities on an interactive map.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
