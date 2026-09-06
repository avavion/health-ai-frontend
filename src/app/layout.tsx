import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Cormorant_Garamond, Lora } from 'next/font/google';
import { defaultLocale, isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import '@/styles/globals.css';

const heading = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-heading-next',
  display: 'swap',
});

const body = Lora({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-body-next',
  display: 'swap',
});

/* Иконки — тот же знак, что у приложения: app_store/web в пакете передачи. */
export const metadata: Metadata = {
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

/* Значения themeColor должны быть литеральными цветами: браузер читает их
   до применения CSS, поэтому var(--color-bg) здесь не сработает. */
export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f2f2' },
    { media: '(prefers-color-scheme: dark)', color: '#12110e' },
  ],
};

const NO_FLASH =
  "(function(){try{var s=localStorage.getItem('healthai-theme')||'system';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})()";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const raw = (await headers()).get('x-locale') ?? defaultLocale;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Тема ставится до первой отрисовки, иначе на тёмной теме мигает светлый кадр. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className={heading.variable + ' ' + body.variable}>
        <ThemeProvider labels={t.theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
