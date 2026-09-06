import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={'container ' + styles.page}>
      <p className="kicker">404</p>
      <h1 className={styles.title}>Страница не найдена</h1>
      <Link className="btn btn-secondary" href="/ru">
        На главную
      </Link>
    </main>
  );
}
