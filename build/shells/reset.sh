#!/bin/bash
set -euo pipefail

line='--------------'

heading() {
    printf '\n%s %s\n' "$line" "$1"
}

# Detect installed PHP-FPM services and MySQL/MariaDB.
mapfile -t php_services < <(
    systemctl list-unit-files --type=service --no-legend --no-pager |
        awk '$1 ~ /^php([0-9.]+)?-fpm\.service$/ {print $1}'
)

db_service=''
for service in mysql.service mariadb.service mysqld.service; do
    if systemctl cat "$service" >/dev/null 2>&1; then
        db_service="$service"
        break
    fi
done

if ((${#php_services[@]} == 0)); then
    echo "Error: No PHP-FPM service found." >&2
    exit 1
fi

if [[ -z "$db_service" ]]; then
    echo "Error: No MySQL/MariaDB service found." >&2
    exit 1
fi

# Check Nginx configuration before restarting anything.
heading "Nginx syntax check"
sudo nginx -t

heading "LEMP versions"

printf 'Linux: '
if [[ -r /etc/os-release ]]; then
    (
        . /etc/os-release
        printf '%s\n' "${PRETTY_NAME:-Unknown distribution}"
    )
else
    uname -s
fi

printf 'Kernel: '
uname -r

nginx -v 2>&1

if command -v php >/dev/null 2>&1; then
    php -v
else
    echo "PHP CLI is not installed; PHP-FPM services: ${php_services[*]}"
fi

if command -v mysql >/dev/null 2>&1; then
    mysql --version
elif command -v mariadb >/dev/null 2>&1; then
    mariadb --version
else
    echo "MySQL/MariaDB client is not installed."
fi

heading "Restart PHP-FPM"
for service in "${php_services[@]}"; do
    sudo systemctl restart "$service"
done

heading "Restart MySQL/MariaDB"
sudo systemctl restart "$db_service"

heading "Restart Nginx"
sudo systemctl restart nginx

heading "Service status"
sudo systemctl status nginx "${php_services[@]}" "$db_service" --no-pager