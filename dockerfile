FROM oven/bun:1.2.2-alpine

WORKDIR /home/app/panchobot

COPY package.json .
COPY pnpm-lock.yaml .

RUN bun install -g pnpm

RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "start"]
