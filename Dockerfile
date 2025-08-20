# Multi-stage Docker build for RAG Financial AI Agent

# Stage 1: Python Backend
FROM python:3.11-slim as python-backend

WORKDIR /app/server

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python source code
COPY server/ .

# Create storage directories
RUN mkdir -p /app/storage/index /app/storage/uploads

# Expose Python backend port
EXPOSE 8000

# Health check for Python backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Stage 2: Node.js Frontend
FROM node:18-alpine as frontend

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY app/ ./app/
COPY components/ ./components/
COPY lib/ ./lib/
COPY types/ ./types/
COPY next-env.d.ts ./

# Build the application
RUN npm run build

# Expose frontend port
EXPOSE 3000

# Stage 3: Production image
FROM node:18-alpine as production

# Install Python and required packages
RUN apk add --no-cache python3 py3-pip curl

WORKDIR /app

# Copy Node.js application
COPY --from=frontend /app ./
COPY --from=frontend /app/node_modules ./node_modules

# Copy Python backend
COPY --from=python-backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-backend /usr/local/bin /usr/local/bin
COPY --from=python-backend /app/server ./server

# Create storage directories
RUN mkdir -p /app/storage/index /app/storage/uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set ownership
RUN chown -R nextjs:nodejs /app/storage
USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PY_BACKEND_URL=http://localhost:8000

# Expose ports
EXPOSE 3000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start both services
CMD ["sh", "-c", "python3 -m server.main & npm start"]

