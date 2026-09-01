import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';

const headingFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pembagian Kelompok Rahasia | Alokasi Seimbang & Rahasia',
  description: 'Platform pembagian kelompok rahasia yang aman, modern, dan otomatis terdistribusi merata berdasarkan jenis kelamin.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${headingFont.variable} ${sansFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FBFBFA] text-[#111111] font-sans selection:bg-[#B4E50D] selection:text-[#111111]">
        {children}
      </body>
    </html>
  );
}
