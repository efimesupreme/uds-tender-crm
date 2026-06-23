import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "UDS Tender CRM",
  description: "Система контроля входящих заявок и тендеров УДС-Проект"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <div className="appShell">
          <Nav />
          <main className="main"><TopBar />{children}</main>
        </div>
      </body>
    </html>
  );
}
