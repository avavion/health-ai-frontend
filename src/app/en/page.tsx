import type { Metadata } from 'next';
import { LandingPage } from '@/components/pages/LandingPage';
import { getDictionary } from '@/i18n/get-dictionary';

const t = getDictionary('en');

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  alternates: { canonical: '/en', languages: { ru: '/ru', en: '/en' } },
};

export default function Page() {
  return <LandingPage locale="en" />;
}
