import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Navira: your story, ready for the doctor',
  description: 'Turn what you tell in your own words into a one-page brief for your clinician. Private, on your device. Not a diagnosis.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#FFF7E6', width: 'device-width', initialScale: 1 };

const THEME_INIT = `try{var t=localStorage.getItem('navira.theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('navira.uiLang');if(l)document.documentElement.lang=l}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
