import type { Metadata } from 'next';
import { ReportsScreen, type SearchParams } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('en').nav.reports + ' — Health AI' };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <ReportsScreen locale="en" searchParams={searchParams} />;
}
