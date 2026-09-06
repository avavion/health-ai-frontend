import type { Metadata } from 'next';
import { CatalogScreen } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('ru').nav.catalog + ' — Health AI' };

export default function Page() {
  return <CatalogScreen locale="ru" />;
}
