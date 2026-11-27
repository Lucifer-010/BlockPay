#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
    echo "Running Django migrations..."
    python manage.py migrate --noinput
fi

if [ "$SEED_DATA" = "true" ] || [ "$SEED_DATA" = "1" ]; then
    echo "Running initial database seeding..."
    python manage.py seed_data --noinput || true
fi

exec "$@"
