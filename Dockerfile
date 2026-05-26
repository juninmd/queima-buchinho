# Stage 1: Build/Install
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 2: Production
FROM oven/bun:1-alpine
WORKDIR /app

# Instalar Python e edge-tts para o TTS da Mika
RUN apk add --no-cache python3 py3-pip curl && \
    pip install edge-tts --break-system-packages

COPY --from=builder /app/node_modules ./node_modules
COPY package.json bun.lockb* ./
COPY . .

RUN mkdir -p assets data && echo "[]" > data/workout-history.json

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

CMD ["bun", "src/index.ts"]
