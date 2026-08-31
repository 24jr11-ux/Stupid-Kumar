import "./globals.css";
import SWRegister from "@/components/SWRegister";

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
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#2C2523]" suppressHydrationWarning>
        {children}
        {/* Registers the service worker that makes the app installable / offline-aware. */}
        <SWRegister />
      </body>
    </html>
  );
}