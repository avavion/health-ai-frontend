import type { Metadata } from 'next';
import { SummaryScreen } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('ru').nav.summary + ' — Health AI' };

export default function Page() {
  return <SummaryScreen locale="ru" />;
}
