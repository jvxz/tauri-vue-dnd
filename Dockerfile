FROM oven/bun:latest AS build

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install

COPY . ./

# ARG EXAMPLE_VARIABLE

RUN bun run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/.output/ ./

ENV NODE_ENV=production

CMD ["node", "/app/server/index.mjs"]
