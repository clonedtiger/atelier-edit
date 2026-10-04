#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Apply additive schema changes only. Without --accept-data-loss, a change that would drop
# a column or table fails here instead of silently deleting production data; the new
# revision then fails its startup check and Cloud Run keeps serving the previous one.
echo "Applying database schema checks and push..."
node node_modules/prisma/build/index.js db push

echo "Starting Next.js application server..."
exec node server.js
