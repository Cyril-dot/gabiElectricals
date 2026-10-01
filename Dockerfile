FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG DATABASE_URL="file:/app/prod.db"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate && npm run build

FROM base AS run
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["sh", "-c", "mkdir -p /app/data && npx prisma db push --skip-generate && if [ ! -f /app/data/.seeded ]; then npx tsx prisma/seed.ts && touch /app/data/.seeded; fi && PORT=3000 npm start"]
