import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Session Viewer",
  description: "Browse Claude Code session transcripts",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
