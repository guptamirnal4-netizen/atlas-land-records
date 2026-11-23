import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AtlasProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "ATLAS - Land Records", template: "%s | ATLAS Land Records" },
  description: "Land Records & Property Intelligence: ownership, legal history and financial charges for Karnataka land parcels.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const themeScript = `try{var t=localStorage.getItem("atlas.theme");if(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AtlasProvider>
          <Shell>{children}</Shell>
        </AtlasProvider>
      </body>
    </html>
  );
}
