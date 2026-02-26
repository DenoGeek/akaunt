# ----------------------
# 1. Build Stage
# ----------------------
FROM node:20-alpine AS builder

# Install required packages
RUN apk add --no-cache libc6-compat openssl

# Set working directory
WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    else npm install; \
    fi

# Copy rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# ----------------------
# 2. Production Image
# ----------------------
FROM node:20-alpine AS runner

# Install required packages
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only needed files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose Next.js port
EXPOSE 3000

# Run migrations then start the Next.js production server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
