#!/bin/sh
set -e

# Read Docker secrets if available
for var in DATABASE_URL AUTH_SECRET; do
  file_var="${var}_FILE"
  eval file_val=\$$file_var
  if [ -n "$file_val" ] && [ -f "$file_val" ]; then
    export "$var"="$(cat "$file_val")"
  fi
done

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec "$@"
