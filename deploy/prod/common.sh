# Общее для скриптов выкатки сайта. Подключается через `source`,
# самостоятельно не запускается.
#
# Схема повторяет выкатку API (health-ai-backend/deploy/prod): те же цвета,
# тот же способ переключения трафика, те же имена файлов. Разные схемы на
# одной машине означали бы, что в три часа ночи придётся вспоминать, какая
# из них перед тобой.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Фронт — Caddy на самом хосте, а не в compose: он уже держит 80 и 443 и
# обслуживает API и другие сайты этой машины.
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
# Файл с одной директивой — адресом живого цвета. Его включает секция сайта
# в CADDYFILE, и владеет им пользователь выкатки: это единственное, что
# скрипту нужно писать за пределами своего каталога.
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/health-web-upstream.conf}"

# Порты цветов на петле. Наружу не смотрят: по ним проверяется здоровье
# нового поколения до переключения трафика, и на них же ходит хостовый Caddy.
#
# 3110 и 3111, а не 3000 и 3001: оба заняты на этой машине — 3000 держит
# панель наблюдения, 3001 занят соседом. Сам контейнер внутри слушает 3000,
# как и полагается Next; наружу он отдаётся на другой порт, и это разные
# вещи. Значения можно переопределить в .env, но тогда придётся поправить и
# секцию Caddy: он живёт на хосте и .env не читает.

# Значение переменной из .env или images.env, без их выполнения.
env_value() {
	sed -n "s/^$1=//p" "${2:-.env}" | tail -1 | tr -d "\"'"
}

if [ -f .env ]; then
	WEB_PORT_BLUE="${WEB_PORT_BLUE:-$(env_value WEB_PORT_BLUE)}"
	WEB_PORT_GREEN="${WEB_PORT_GREEN:-$(env_value WEB_PORT_GREEN)}"
fi
WEB_PORT_BLUE="${WEB_PORT_BLUE:-3110}"
WEB_PORT_GREEN="${WEB_PORT_GREEN:-3111}"

port_of() {
	case "$1" in
	blue) echo "$WEB_PORT_BLUE" ;;
	green) echo "$WEB_PORT_GREEN" ;;
	*)
		echo "неизвестный цвет: $1" >&2
		return 1
		;;
	esac
}

color_of_port() {
	case "$1" in
	"$WEB_PORT_BLUE") echo blue ;;
	"$WEB_PORT_GREEN") echo green ;;
	*) return 1 ;;
	esac
}

other_color() {
	case "$1" in
	blue) echo green ;;
	green) echo blue ;;
	esac
}

# Живой цвет читается из конфигурации Caddy, а не из отдельного файла
# состояния: она и есть то, куда на самом деле идёт трафик, и разойтись
# сама с собой не может.
active_color() {
	if [ ! -f "$UPSTREAM_FILE" ]; then
		return 1
	fi
	# Выражение намеренно без \| — это расширение GNU sed, и скрипт,
	# переключающий трафик, не должен зависеть от диалекта sed на машине.
	local port
	port="$(sed -n 's/.*127\.0\.0\.1:\([0-9][0-9]*\).*/\1/p' "$UPSTREAM_FILE" | head -1)"

	color_of_port "$port"
}

# Переписывает адрес живого цвета.
write_upstream() {
	local color="$1" port
	port="$(port_of "$color")"

	cat >"$UPSTREAM_FILE" <<UPSTREAM
# Файл создаётся выкаткой, править руками незачем: живой цвет здесь — ${color}.
reverse_proxy 127.0.0.1:${port}
UPSTREAM
}

compose() {
	# Оба файла обязательны: в .env лежит домен и порты цветов, в images.env —
	# образы. Без второго compose не разберёт docker-compose.yml вовсе, потому
	# что подстановка ${WEB_IMAGE_*} останется незаполненной.
	docker compose --env-file .env --env-file images.env -f docker-compose.yml "$@"
}

# Перечитывание идёт через админ-API Caddy на 127.0.0.1:2019, поэтому root
# не нужен. Заодно это безопаснее перезапуска: конфигурацию Caddy сначала
# проверяет и при ошибке оставляет работать прежнюю — ни API, ни чужие сайты
# на этой машине падать от выкатки сайта не должны.
reload_caddy() {
	caddy reload --config "$CADDYFILE"
}

# Занят ли порт кем-то, кроме нашего же контейнера этого цвета.
#
# Проверка до подъёма, а не после: контейнер, не сумевший занять порт,
# сообщает об этом строкой docker в конце длинного вывода, и разбираться в
# ней в момент выкатки — худшее время. Проверка мягкая: без ss и lsof она
# ничего не утверждает, потому что «не смог посмотреть» и «свободен» — разные
# вещи, и врать во второй раз хуже, чем промолчать.
port_taken_by_stranger() {
	local port="$1" color="$2" listener=""

	if command -v ss >/dev/null 2>&1; then
		listener="$(ss -ltnH "sport = :$port" 2>/dev/null || true)"
	elif command -v lsof >/dev/null 2>&1; then
		listener="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
	else
		return 1
	fi

	[ -n "$listener" ] || return 1

	# Порт наш, если его держит контейнер этого цвета: обычная картина
	# повторной выкатки.
	local state
	state="$(docker inspect -f '{{.State.Status}}' "health-ai-web-$color" 2>/dev/null || echo missing)"
	[ "$state" = "running" ] && return 1

	return 0
}

require_setup() {
	# Три разные беды с разными ответами, поэтому и проверки раздельные.
	if [ ! -f docker-compose.yml ]; then
		echo "нет docker-compose.yml" >&2
		echo "Он приезжает из репозитория при выкатке — запустите Deploy в GitHub Actions." >&2
		exit 1
	fi

	local missing=""
	for file in .env site.env; do
		[ -f "$file" ] || missing="$missing $file"
	done
	if [ -n "$missing" ]; then
		echo "не хватает файлов с настройками:$missing" >&2
		echo "Заполняются руками один раз: секреты через GitHub не проходят и не должны." >&2
		echo "Рядом лежат шаблоны env.example и site.env.example — скопируйте под нужными" >&2
		echo "именами, заполните, закройте chmod 600." >&2
		echo "Подробно: docs/DEPLOY.md, раздел 2." >&2
		exit 1
	fi

	# Без права записи в этот файл переключить трафик нечем, и узнать об этом
	# лучше до того, как новое поколение поднято.
	if [ ! -w "$UPSTREAM_FILE" ]; then
		echo "нет доступа на запись в $UPSTREAM_FILE" >&2
		echo "Файл заводится под root один раз и передаётся пользователю выкатки." >&2
		echo "Подробно: docs/DEPLOY.md, раздел 2." >&2
		exit 1
	fi

	if ! command -v caddy >/dev/null; then
		echo "не найден caddy — фронтом служит Caddy на хосте, см. docs/DEPLOY.md" >&2
		exit 1
	fi

	# Два --env-file в одной команде появились в Compose 2.24.
	local version
	version="$(docker compose version --short 2>/dev/null || echo 0)"
	if [ "$(printf '%s\n2.24.0\n' "$version" | sort -V | head -1)" != "2.24.0" ]; then
		echo "нужен docker compose 2.24 или новее, найден $version" >&2
		exit 1
	fi
}

log() { printf '\033[1m==>\033[0m %s\n' "$*"; }
