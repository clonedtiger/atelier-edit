#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Applying database schema checks and push..."
node node_modules/prisma/build/index.js db push --accept-data-loss

echo "Starting Next.js application server..."
exec node server.js
