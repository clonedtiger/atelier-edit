# Stage 1: Base image
FROM node:20-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (needed for build)
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 4: Production runner
FROM base AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for Next.js cache directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy built standalone package and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Make startup entrypoint executable and strip carriage returns if checked in as CRLF
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["sh", "./entrypoint.sh"]
