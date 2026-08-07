# ============================================================
#  Stage 1 — Build
#  Uses Node 20 Alpine to install deps and run `vite build`
# ============================================================
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package files first (layer caching — only reinstalls if deps change)
COPY frontend/package.json frontend/package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the source code
COPY frontend/ ./

# Build the production bundle → outputs to /app/dist
RUN npm run build

# ============================================================
#  Stage 2 — Serve
#  Uses tiny Nginx image to serve the built static files
#  Final image is ~25MB (no Node, no node_modules)
# ============================================================
FROM nginx:stable-alpine

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config (handles React Router + API proxy)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
