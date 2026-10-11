import "./globals.css";
import localFont from "next/font/local";
import SWRegister from "@/components/SWRegister";
import SessionGuard from "@/components/SessionGuard";
import AppTransitions from "@/components/AppTransitions";
import { launchBootstrap } from "@/lib/launch";

const handwriting = localFont({
  src: "../../public/fonts/Caveat-Latin.woff2",
  variable: "--font-chosen-handwriting",
  weight: "400 700",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  fallback: [],
});

export const metadata = {
  title: {
    default: "Stupid & Kumar",
    template: "%s | Stupid & Kumar",
  },
  description: "The ever-growing timeline of us.",
  applicationName: "Stupid & Kumar",
  appleWebApp: {
    capable: true,
    title: "Stupid & Kumar",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico?v=2",
    apple: [{ url: "/icons/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(display-mode: standalone)", color: "#96B82D" },
    { media: "(display-mode: browser)", color: "#000000" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full antialiased ${handwriting.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: launchBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col text-[#FAF7F2]" suppressHydrationWarning>
        <AppTransitions><SessionGuard>{children}</SessionGuard></AppTransitions>
        {/* Registers the service worker that makes the app installable / offline-aware. */}
        <SWRegister />
      </body>
    </html>
  );
}
