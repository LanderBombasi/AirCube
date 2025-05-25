
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from '@/contexts/SettingsContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AirCube: Air Quality Monitoring',
  description: 'Monitor CO2, CO, Temperature, and Humidity levels in real-time with AirCube.',
  manifest: '/manifest.json', // Added for PWA
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2E9AFE" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SettingsProvider>
          {children}
          <Toaster />
        </SettingsProvider>
      </body>
    </html>
  );
}
