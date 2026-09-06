import type { Metadata } from 'next';
import { EntryScreen, type SearchParams } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('ru').nav.entry + ' — Health AI' };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <EntryScreen locale="ru" searchParams={searchParams} />;
}
