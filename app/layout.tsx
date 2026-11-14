import type { Metadata, Viewport } from "next";
import "@fontsource-variable/anek-tamil/wdth.css";
import "@fontsource-variable/hanken-grotesk/index.css";
import "@fontsource-variable/noto-sans-tamil/index.css";
import "./globals.css";
import { Providers } from "@/components/store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Neram",
  description: "A personal Tamil almanac: good and bad time, dasa, Pancha Pakshi, transits and money outlook.",
};

export const viewport: Viewport = {
  themeColor: "#edf2f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
