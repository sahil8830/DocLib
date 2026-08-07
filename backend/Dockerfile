# ============================================================
#  DocLib — Backend Dockerfile
#  Node.js 20 + Express.js API Gateway
# ============================================================

# Use Node 20 Alpine — lightweight (~180MB vs ~900MB for full Node)
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
# Copy package files FIRST (Docker layer caching trick)
# If package.json hasn't changed, Docker skips `npm ci` on next build
COPY backend/package.json backend/package-lock.json ./

# Install ONLY production dependencies (skip devDependencies like nodemon)
RUN npm ci --omit=dev

# ── Copy source code ─────────────────────────────────────────
# Copied AFTER npm ci so source changes don't invalidate the npm cache layer
COPY backend/src/ ./src/

# ── Create uploads directory ──────────────────────────────────
# Your index.js creates this at runtime, but creating it here
# ensures it exists with the right permissions from the start
RUN mkdir -p uploads && chown node:node uploads

# ── Security: run as non-root user ───────────────────────────
# "node" is a built-in user in the node:alpine image
# Running as root inside a container is a security risk
USER node

# Expose the port your Express app listens on
EXPOSE 3001

# Start the production server (NOT nodemon — that's for dev only)
CMD ["node", "src/index.js"]
