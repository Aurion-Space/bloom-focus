FROM node:20-bookworm-slim AS build

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/app/server/data/bloomfocus.db

COPY --from=build /app/server/package*.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/migrations ./migrations

RUN mkdir -p /app/server/data

EXPOSE 4000

CMD ["node", "dist/index.js"]
