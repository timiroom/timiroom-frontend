# Multi-stage build for Next.js (standalone output)
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN mkdir -p public

# NEXT_PUBLIC_* 변수는 빌드 타임에 번들에 정적 삽입되므로 ARG로 주입
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ARG NEXT_PUBLIC_RAG_PIPELINE_URL=http://localhost:8081
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_INTEGRATION_ENABLED=false
ARG NEXT_PUBLIC_SLACK_ENABLED=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_RAG_PIPELINE_URL=$NEXT_PUBLIC_RAG_PIPELINE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_INTEGRATION_ENABLED=$NEXT_PUBLIC_INTEGRATION_ENABLED
ENV NEXT_PUBLIC_SLACK_ENABLED=$NEXT_PUBLIC_SLACK_ENABLED

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build output
COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static
COPY --from=builder --chown=1000:1000 /app/public ./public

USER 1000:1000

EXPOSE 3000

CMD ["node", "server.js"]
