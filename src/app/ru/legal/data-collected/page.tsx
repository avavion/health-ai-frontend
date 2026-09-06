import type { Metadata } from 'next';
import { LegalPage } from '@/components/pages/LegalPage';
import { getDictionary } from '@/i18n/get-dictionary';

/** ISR: документ перезапрашивается у бэкенда не чаще раза в час. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: getDictionary('ru').legal['data-collected'] + ' — Health AI',
};

export default function Page() {
  return <LegalPage locale="ru" slug="data-collected" />;
}
