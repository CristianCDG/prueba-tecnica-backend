FROM node:20-alpine AS builder
WORKDIR /app

COPY payment-service/package*.json ./
COPY payment-service/prisma.config.ts ./
RUN npm ci

COPY payment-service/prisma ./prisma
COPY prisma/migrations ./prisma/migrations
RUN npx prisma generate

COPY payment-service/src ./src
COPY payment-service/tsconfig*.json ./
COPY payment-service/nest-cli.json ./
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY payment-service/package*.json ./
COPY payment-service/prisma.config.ts ./
COPY payment-service/prisma ./prisma
COPY prisma/migrations ./prisma/migrations
RUN npm ci && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
