import type { Metadata } from 'next';
import { TodayScreen, type SearchParams } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('en').nav.today + ' — Health AI' };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <TodayScreen locale="en" searchParams={searchParams} />;
}
