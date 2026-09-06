#!/usr/bin/env bash
#
# Выкатка сайта. Запускается из workflow по ssh, руками — только при разборе.
#
#   ./deploy.sh --image ghcr.io/avavion/health-ai-frontend:sha-abc1234
#
# Что делает: записывает образ в images.env, поднимает контейнер, ждёт от
# него ответа и, если не дождался, возвращает прежний образ. Blue/green здесь
# нет намеренно — см. комментарий в docker-compose.yml.
set -euo pipefail

cd "$(dirname "$0")"

IMAGE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --image) IMAGE="${2:?--image без значения}"; shift 2 ;;
    *) echo "неизвестный аргумент: $1" >&2; exit 2 ;;
  esac
done

[ -n "$IMAGE" ] || { echo "не задан --image" >&2; exit 2; }
[ -f .env ] || { echo "нет .env — заведите его из env.example" >&2; exit 1; }
[ -f site.env ] || { echo "нет site.env — заведите его из site.env.example" >&2; exit 1; }

# shellcheck disable=SC1091
. ./.env

PORT="${WEB_PORT:-3100}"
PREVIOUS=""
[ -f images.env ] && PREVIOUS="$(grep -E '^WEB_IMAGE=' images.env | cut -d= -f2- || true)"

echo "Выкатка $IMAGE (прежний: ${PREVIOUS:-нет})"

docker pull "$IMAGE"

write_image() {
  printf 'WEB_IMAGE=%s\n' "$1" > images.env
}

compose() {
  docker compose --env-file .env --env-file images.env -f docker-compose.yml "$@"
}

write_image "$IMAGE"
compose up -d --force-recreate web

# Ждём ответа от нового контейнера. Проверяется страница, а не порт: открытый
# порт означает лишь, что процесс стартовал, а нам нужно, чтобы он собирал
# страницы, — то есть чтобы у него был доступ к API.
echo -n "жду ответа на 127.0.0.1:$PORT"
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/ru" > /dev/null 2>&1; then
    echo " — отвечает"
    echo "Готово: $IMAGE"
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo
echo "Новый образ не ответил за минуту." >&2

if [ -n "$PREVIOUS" ]; then
  echo "Возвращаю прежний: $PREVIOUS" >&2
  write_image "$PREVIOUS"
  compose up -d --force-recreate web
else
  echo "Прежнего образа нет — сайт остаётся лежащим, разбирайтесь по логам:" >&2
  echo "  docker logs health-ai-web" >&2
fi

exit 1
