import type { Metadata } from 'next';
import { SettingsScreenPage } from '@/components/pages/app/screens';
import { getAppDictionary } from '@/i18n/get-app-dictionary';

export const metadata: Metadata = { title: getAppDictionary('en').nav.settings + ' — Health AI' };

export default function Page() {
  return <SettingsScreenPage locale="en" />;
}
