import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";

const dmSans = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-dmSans",
});

export const metadata: Metadata = {
  title: "Training Beat-1",
  description: "A Progressive Web App for athletes",
  icons: {
    icon: [
      { url: "/web-app-manifest-192x192.png", sizes: "192x192" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TB-2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
