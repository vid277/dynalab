FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build args for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage with Caddy
FROM caddy:2-alpine

WORKDIR /app

# Copy Caddyfile
COPY Caddyfile ./

# Format Caddyfile
RUN caddy fmt Caddyfile --overwrite

# Copy built files
COPY --from=build /app/dist ./dist

# Run Caddy
CMD ["caddy", "run", "--config", "Caddyfile", "--adapter", "caddyfile"]
