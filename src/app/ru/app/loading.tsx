import { ScreenSkeleton } from '@/components/app/ScreenStates';

/** Скелетон, пока страница собирается на сервере. */
export default function Loading() {
  return <ScreenSkeleton />;
}
