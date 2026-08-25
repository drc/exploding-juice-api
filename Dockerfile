FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl python3 python3-pip ca-certificates && \
    pip3 install --break-system-packages yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["pnpm", "start"]
