#!/usr/bin/env bash
#
# Выкатка нового образа сайта в свободный цвет с переключением трафика.
#
#   ./deploy.sh --image ghcr.io/avavion/health-ai-frontend:sha-ab12cd3 --version v1.0.0
#
# Что происходит: новое поколение поднимается рядом с живым и проверяется с
# петли. Трафик переключается только после того, как новый цвет ответил своей
# версией. Старый цвет остаётся запущенным — откат это переключение обратно,
# а не пересборка (rollback.sh).
#
# Отличие от выкатки API: у сайта нет базы, поэтому нет ни миграций, ни дампа
# перед ними. Всё остальное совпадает намеренно.
#
# Запускается на сервере, обычно из GitHub Actions по SSH.

source "$(dirname "$0")/common.sh"

IMAGE=""
VERSION=""
# Сколько ждать, пока новый цвет ответит. Полминуты хватает с запасом: внутри
# только старт сервера Next, в сеть на старте он не ходит.
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-45}"
# Отдельное ожидание для проверки через публичный адрес: на первой выкатке
# в него попадает выпуск сертификата, которого на последующих уже нет.
PUBLIC_TIMEOUT="${PUBLIC_TIMEOUT:-60}"

while [ $# -gt 0 ]; do
	case "$1" in
	--image)
		IMAGE="$2"
		shift 2
		;;
	--version)
		VERSION="$2"
		shift 2
		;;
	*)
		echo "неизвестный аргумент: $1" >&2
		exit 1
		;;
	esac
done

[ -n "$IMAGE" ] || {
	echo "не задан --image" >&2
	exit 1
}
[ -n "$VERSION" ] || {
	echo "не задан --version" >&2
	exit 1
}

require_setup

FIRST_DEPLOY=0
if ! ACTIVE="$(active_color)" || [ -z "$ACTIVE" ]; then
	# Первая выкатка: живого цвета нет, всё начинается с blue. Адрес в
	# конфигурацию Caddy пишется не здесь, а после проверки, — иначе фронт
	# первым делом начал бы проксировать на ещё не поднятый порт.
	FIRST_DEPLOY=1
	ACTIVE=""
	TARGET=blue
else
	TARGET="$(other_color "$ACTIVE")"
fi

TARGET_PORT="$(port_of "$TARGET")"

if port_taken_by_stranger "$TARGET_PORT" "$TARGET"; then
	echo "порт $TARGET_PORT занят не нашим контейнером" >&2
	echo "Посмотрите, кем:  sudo ss -ltnp 'sport = :$TARGET_PORT'" >&2
	echo "и либо освободите порт, либо задайте другой в .env (WEB_PORT_*)," >&2
	echo "поправив заодно секцию сайта в /etc/caddy/Caddyfile." >&2
	exit 1
fi

# images.env хранит, какой образ крутится в каждом цвете. Он же — то, что
# читает compose при подстановке. На первой выкатке оба цвета получают один
# образ: цвет, в который ещё не выкатывались, всё равно не запускается, но
# без значения переменной compose не разберёт файл.
if [ ! -f images.env ]; then
	printf 'WEB_IMAGE_BLUE=%s\nWEB_IMAGE_GREEN=%s\n' "$IMAGE" "$IMAGE" >images.env
fi
cp images.env images.env.previous

KEY="WEB_IMAGE_$(printf '%s' "$TARGET" | tr '[:lower:]' '[:upper:]')"
grep -v "^$KEY=" images.env >images.env.new || true
printf '%s=%s\n' "$KEY" "$IMAGE" >>images.env.new
mv images.env.new images.env

# Возврат images.env к тому, что было до выкатки. Нужен на каждом выходе
# до переключения трафика: иначе файл остался бы указывать на образ, который
# так и не поднялся, и следующая команда compose спотыкалась бы о него.
restore_images() {
	[ -f images.env.previous ] && mv images.env.previous images.env
}

log "живой цвет: ${ACTIVE:-нет}, выкатываю в $TARGET образ $IMAGE ($VERSION)"

log "тяну образ"
if ! compose pull "web-$TARGET"; then
	# Реестр мог моргнуть, а образ — уже лежать на машине: обычное дело при
	# повторной выкатке того же тега. Отсутствие образа поймает следующий шаг.
	if docker image inspect "$IMAGE" >/dev/null 2>&1; then
		log "реестр недоступен, но образ уже есть на машине — продолжаю"
	else
		echo "не удалось получить образ $IMAGE" >&2
		restore_images
		exit 1
	fi
fi

log "поднимаю $TARGET"
if ! compose up -d --no-deps --force-recreate "web-$TARGET"; then
	echo "контейнер $TARGET не поднялся" >&2
	restore_images
	exit 1
fi

log "жду ответа на 127.0.0.1:$TARGET_PORT (до ${HEALTH_TIMEOUT}с)"

healthy=0
deadline=$((SECONDS + HEALTH_TIMEOUT))
while [ $SECONDS -lt $deadline ]; do
	state="$(docker inspect -f '{{.State.Status}}' "health-ai-web-$TARGET" 2>/dev/null || echo missing)"
	if [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
		echo "контейнер $TARGET завершился, не дождавшись проверки" >&2
		break
	fi

	body="$(curl -fsS --max-time 5 "http://127.0.0.1:$TARGET_PORT/api/health" 2>/dev/null || true)"
	if [ -n "$body" ]; then
		got="$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
		# Версия сверяется, а не только код ответа: на порту мог остаться
		# прежний контейнер этого цвета, и «здоров» сказал бы старый код.
		if printf '%s' "$body" | grep -q '"status":"ok"' && [ "$got" = "$VERSION" ]; then
			healthy=1
			break
		fi
	fi
	sleep 2
done

# Второй проверкой — настоящая страница. /api/health отвечает, пока жив
# процесс; собрать лендинг он может и не суметь, а именно это человек и
# увидит первым.
if [ "$healthy" = 1 ]; then
	if ! curl -fsS --max-time 10 "http://127.0.0.1:$TARGET_PORT/ru" >/dev/null 2>&1; then
		echo "цвет $TARGET отвечает здоровьем, но не отдаёт лендинг" >&2
		healthy=0
	fi
fi

if [ "$healthy" != 1 ]; then
	echo "" >&2
	echo "новый цвет не поднялся — трафик остался на ${ACTIVE:-прежнем месте}" >&2
	echo "последние строки журнала:" >&2
	compose logs --tail=50 "web-$TARGET" >&2 || true

	compose stop "web-$TARGET" || true
	compose rm -f "web-$TARGET" || true
	restore_images
	exit 1
fi

log "цвет $TARGET здоров, переключаю трафик"
write_upstream "$TARGET"
reload_caddy

DOMAIN="$(env_value DOMAIN)"
log "проверяю через https://$DOMAIN"

# Одним запросом проверять нельзя: на первой выкатке Caddy в этот момент
# ещё выпускает сертификат Let's Encrypt, и отказ означал бы не поломку,
# а то, что мы спросили слишком рано.
public_version=""
public_deadline=$((SECONDS + PUBLIC_TIMEOUT))
while [ $SECONDS -lt $public_deadline ]; do
	public="$(curl -fsS --max-time 10 "https://$DOMAIN/api/health" 2>/dev/null || true)"
	public_version="$(printf '%s' "$public" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
	[ "$public_version" = "$VERSION" ] && break
	sleep 3
done

if [ "$public_version" != "$VERSION" ]; then
	echo "публичный адрес отвечает версией «${public_version:-нет ответа}», ожидалась $VERSION" >&2
	if [ -n "$ACTIVE" ]; then
		echo "возвращаю трафик на $ACTIVE" >&2
		write_upstream "$ACTIVE"
		reload_caddy
	fi
	restore_images
	exit 1
fi

rm -f images.env.previous

if [ -n "$ACTIVE" ]; then
	# Старый цвет намеренно остаётся запущенным до следующей выкатки:
	# так откат — это перезапись одной строки и reload, то есть секунда.
	log "готово. Трафик на $TARGET ($VERSION), $ACTIVE остаётся поднятым для отката"
else
	log "готово. Трафик на $TARGET ($VERSION)"
fi
