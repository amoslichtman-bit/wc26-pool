import type { Metadata } from 'next';
import './globals.css';
import NavBar from '../components/NavBar';
import { Analytics } from "@vercel/analytics/next"
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'World Cup 2026 Pool',
  description: 'Track and score your World Cup predictions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200 antialiased min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-grow">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}