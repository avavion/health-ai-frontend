#!/usr/bin/env bash
#
# Возврат трафика на предыдущий цвет сайта.
#
#   ./rollback.sh
#
# Предыдущее поколение остаётся запущенным после выкатки, поэтому откат —
# это перезапись адреса и reload Caddy, около секунды. Пересборки здесь нет.
#
# В отличие от API, откатывать нечего, кроме самого кода: базы у сайта нет,
# а сессии живут в cookie у человека и в базе API — перезапуск никого не
# разлогинивает и ничего не теряет.

source "$(dirname "$0")/common.sh"

require_setup

ACTIVE="$(active_color)" || {
	echo "не могу определить живой цвет: нет upstream.conf" >&2
	exit 1
}
PREVIOUS="$(other_color "$ACTIVE")"
PREVIOUS_PORT="$(port_of "$PREVIOUS")"

state="$(docker inspect -f '{{.State.Status}}' "health-ai-web-$PREVIOUS" 2>/dev/null || echo missing)"
if [ "$state" != "running" ]; then
	echo "цвет $PREVIOUS не запущен (состояние: $state) — откатывать некуда." >&2
	echo "Выкатите нужную версию заново: deploy.sh --image ... --version ..." >&2
	exit 1
fi

body="$(curl -fsS --max-time 5 "http://127.0.0.1:$PREVIOUS_PORT/api/health" 2>/dev/null || true)"
version="$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"

if ! printf '%s' "$body" | grep -q '"status":"ok"'; then
	echo "цвет $PREVIOUS запущен, но не отвечает здоровьем — откат туда не поможет" >&2
	exit 1
fi

log "возвращаю трафик с $ACTIVE на $PREVIOUS (${version:-версия неизвестна})"
write_upstream "$PREVIOUS"
reload_caddy

DOMAIN="$(env_value DOMAIN)"
public="$(curl -fsS --max-time 10 "https://$DOMAIN/api/health" 2>/dev/null || true)"
public_version="$(printf '%s' "$public" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"

if [ "$public_version" != "$version" ]; then
	echo "публичный адрес отвечает версией «${public_version:-нет ответа}», ожидалась $version" >&2
	exit 1
fi

log "готово. Трафик на $PREVIOUS ($version)"
