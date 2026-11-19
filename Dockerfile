# Multi-stage build for Calendar Booking Application
# Uses clean Node.js without runtime dependencies

# Stage 1: Build/prepare the application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Браузеры Playwright для сборки образа не нужны
# (их ставит только обёртка hexlet-check в отдельном образе)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Полные зависимости: TypeSpec-компилятор и эмиттеры (@typespec/*) —
# это devDependencies, без них `tsp compile` не находит импорты и эмиттер
COPY package*.json ./
RUN npm ci

# Copy TypeSpec source and generate OpenAPI
COPY typespec/ ./typespec/
RUN npx tsp compile ./typespec

# Copy source code, scripts and static files
# (public/generated-api.js закоммичен, typespec/generated/ генерируется выше)
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY public/ ./public/

# Рантайму приложения внешние зависимости не нужны
RUN npm prune --omit=dev

# Stage 2: Runtime image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifacts from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/typespec/generated ./typespec/generated
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package*.json ./

# data.json создаётся при бронировании — каталог должен быть доступен appuser
RUN chown -R appuser:appgroup /app

# Set environment variables defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV SLOT_MINUTES=15

# Expose the application port
EXPOSE ${PORT}

# Start the application automatically
USER appuser
CMD ["node", "src/server.js"]
