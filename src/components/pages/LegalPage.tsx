import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { fetchLegalDocument, type LegalSlug } from '@/lib/legal';
import { parseLegalMarkdown } from '@/lib/markdown';
import { LegalBlocks } from '@/components/legal/LegalBlocks';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import styles from '@/components/legal/legal.module.css';
import { route } from '@/lib/route';

/**
 * Правовой документ приходит с бэкенда Markdown-ом (GET /legal/{slug}) и
 * разбирается тем же набором блоков, что в iOS. Страница ISR: см. revalidate
 * в файле маршрута.
 */
export async function LegalPage({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
  const t = getDictionary(locale);

  let document: Awaited<ReturnType<typeof fetchLegalDocument>> | null = null;
  try {
    document = await fetchLegalDocument(slug, locale);
  } catch {
    document = null;
  }

  return (
    <>
      <SiteHeader locale={locale} t={t} variant="legal" />
      <main className={styles.page}>
        {document ? (
          <>
            <p className={'kicker tnum ' + styles.version}>
              {t.legal.version} {document.version}
            </p>
            <h1 className={styles.title}>{document.title || t.legal[slug]}</h1>
            <hr className="hr" />
            <LegalBlocks blocks={parseLegalMarkdown(document.body_markdown)} />
          </>
        ) : (
          <div className={styles.fallback}>
            <h1 className={styles.title}>{t.legal[slug]}</h1>
            <p className={styles.fallbackTitle}>{t.legal.unavailable}</p>
            <p>{t.legal.unavailableBody}</p>
          </div>
        )}
        <p className={styles.backRow}>
          <Link className="btn btn-secondary" href={route('/' + locale)}>
            {t.legal.back}
          </Link>
        </p>
      </main>
      <SiteFooter locale={locale} t={t} />
    </>
  );
}
