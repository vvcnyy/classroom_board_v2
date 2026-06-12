import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "디미고 인원점검",
  description: "Classroom attendance board",
  manifest: "/manifest_student.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
