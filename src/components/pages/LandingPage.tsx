import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Hero } from '@/components/landing/Hero';
import { Steps } from '@/components/landing/Steps';
import { Features } from '@/components/landing/Features';
import { Comparison } from '@/components/landing/Comparison';
import { FreePlan } from '@/components/landing/FreePlan';
import { SupportSection } from '@/components/support/SupportSection';

export function LandingPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <>
      <SiteHeader locale={locale} t={t} />
      <main>
        <Hero t={t} />
        <Steps t={t} />
        <Features t={t} />
        <Comparison t={t} />
        <FreePlan t={t} />
        <SupportSection locale={locale} t={t} />
      </main>
      <SiteFooter locale={locale} t={t} />
    </>
  );
}
