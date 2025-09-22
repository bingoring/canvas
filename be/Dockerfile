# Multi-stage Dockerfile for Canvas AI Orchestration Platform
# Base image with Node.js LTS
FROM node:20-alpine AS base

# Install system dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Change ownership to app user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base AS build

# Install all dependencies
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build && \
    npm prune --omit=dev && \
    npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install production system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from build stage
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/plugins-external && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Testing stage
FROM development AS test

# Copy test files
COPY test/ ./test/

# Install additional test dependencies if needed
RUN npm ci --include=dev

# Run tests
CMD ["npm", "run", "test"]

# Security scan stage (optional)
FROM aquasec/trivy:latest AS security-scan

COPY --from=production /app /scan-target

# Run security scan
RUN trivy fs /scan-target