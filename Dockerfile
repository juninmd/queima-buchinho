# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache build-base git python3

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app

# Instalar Python e edge-tts
RUN apk add --no-cache python3 py3-pip && \
    pip install edge-tts --break-system-packages

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
RUN mkdir -p assets data && echo "[]" > data/workout-history.json

CMD ["pnpm", "start"]
