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
FROM oven/bun:1-debian
WORKDIR /app

# Instalar Python e edge-tts para o TTS da Mika
# Vídeo da Mika (src/features/mika-video): Chromium headless renderiza o VRM em WebGL por software e o ffmpeg monta o mp4.
# Debian (glibc): o Chromium do alpine não traz o SwiftShader, então o WebGL por software falhava
# e o vídeo da Mika nunca era gerado (caía sempre na voz).
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip curl fonts-dejavu-core chromium ffmpeg && \
    pip install edge-tts --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

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
