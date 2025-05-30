import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth";
import { Toaster } from "@/components/ui/sonner";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { cn } from "@/lib/utils";
import { FixTableStyleComponent } from "@/components/fix-table-style-component";

const fontSans = FontSans({
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Rodnik – Управление документами",
  description: "Управление документами",
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          {children}
          <SettingsDialog />
          <Toaster />
          <FixTableStyleComponent />
        </AuthProvider>
      </body>
    </html>
  );
}
