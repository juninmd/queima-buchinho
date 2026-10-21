# Stage 1: Build/Install
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: PWA (dashboard/ -> dashboard/dist, servido pela API na porta DASHBOARD_PORT)
FROM oven/bun:1-alpine AS pwa
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/bun.lock* ./
RUN bun install --frozen-lockfile
COPY dashboard/ ./
RUN bun run build

# Stage 3: Production
FROM oven/bun:1-alpine
WORKDIR /app

# Instalar Python e edge-tts para o TTS da Mika
# Vídeo da Mika (src/features/mika-video): Chromium headless renderiza o VRM em WebGL por software e o ffmpeg monta o mp4.
RUN apk add --no-cache python3 py3-pip curl font-dejavu chromium ffmpeg && \
    pip install edge-tts --break-system-packages

COPY --from=builder /app/node_modules ./node_modules
COPY package.json bun.lock* ./
COPY . .
COPY --from=pwa /app/dashboard/dist ./dashboard/dist

ENV CHROMIUM_PATH=/usr/bin/chromium

RUN mkdir -p assets data && echo "[]" > data/workout-history.json

EXPOSE 8080 8081
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

CMD bun src/scripts/migrate.ts && bun src/index.ts
