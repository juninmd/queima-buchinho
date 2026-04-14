# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
RUN mkdir -p assets data && echo "[]" > data/workout-history.json

CMD ["pnpm", "start"]
