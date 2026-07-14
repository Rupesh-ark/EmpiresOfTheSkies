FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/game/package.json ./packages/game/
COPY server/package.json ./server/
COPY vendor/ ./vendor/

RUN pnpm install --frozen-lockfile

COPY packages/game/ ./packages/game/
RUN pnpm --filter @eots/game build

COPY server/ ./server/
RUN pnpm --filter empires-server build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/game/package.json ./packages/game/
COPY server/package.json ./server/
COPY vendor/ ./vendor/

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate && \
    pnpm install --frozen-lockfile --prod && \
    pnpm store prune

RUN addgroup -S eots && adduser -S eots -G eots

COPY --from=builder /app/packages/game/dist ./packages/game/dist
COPY --from=builder /app/server/dist ./server/dist

ENV NODE_ENV=production
EXPOSE 8000

USER eots
CMD ["node", "server/dist/server.js"]