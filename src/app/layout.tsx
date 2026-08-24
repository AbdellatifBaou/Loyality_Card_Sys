import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketif Loyalty | Das digitale Treueprogramm",
  description: "Binde Kunden digital mit Google Wallet & Apple Wallet. Einfache Scanner-App für Mitarbeiter, keine physischen Stempelkarten mehr.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/Marketif_LOGO_Symbol.png", type: "image/png" },
    ],
    apple: [
      { url: "/Marketif_LOGO_Symbol.png", type: "image/png" },
    ],
    shortcut: "/Marketif_LOGO_Symbol.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Marketif Scanner",
  },
  openGraph: {
    title: "Marketif Loyalty | Kundenbindung per Wallet",
    description: "Moderne Kundenbindung für lokale Geschäfte. Digitale Stempelkarte direkt in der Wallet deiner Kunden.",
    url: "https://treue.marketif.de",
    siteName: "Marketif Loyalty",
    images: [
      {
        url: "https://treue.marketif.de/dashboard-preview.jpg", // We have this in public/
        width: 1200,
        height: 630,
        alt: "Marketif Loyalty Dashboard",
      }
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketif Loyalty | Kundenbindung per Wallet",
    description: "Moderne Kundenbindung für lokale Geschäfte. Digitale Stempelkarte direkt in der Wallet deiner Kunden.",
    images: ["https://treue.marketif.de/dashboard-preview.jpg"],
  },
};

export const viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
