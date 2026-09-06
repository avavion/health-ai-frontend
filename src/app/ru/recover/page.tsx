import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RecoverForm } from '@/components/auth/RecoverForm';
import { getAppDictionary } from '@/i18n/get-app-dictionary';
import { getDictionary } from '@/i18n/get-dictionary';

const t = getAppDictionary('ru');
const site = getDictionary('ru');

export const metadata: Metadata = { title: t.auth.recoverKicker + ' — Health AI' };

export default function Page() {
  return (
    <AuthLayout locale="ru" site={site}>
      <RecoverForm locale="ru" t={t} />
    </AuthLayout>
  );
}
