#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Applying database schema checks and push..."
npx prisma db push --skip-generate --accept-destructive-db-changes

echo "Starting Next.js application server..."
exec node server.js
