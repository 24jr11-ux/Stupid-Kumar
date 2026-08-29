import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SWRegister from "@/components/SWRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171717",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Registers the service worker that makes the app installable / offline-aware. */}
        <SWRegister />
      </body>
    </html>
  );
}