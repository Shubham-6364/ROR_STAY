# Multi-stage build for React frontend
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Accept build arguments for React environment variables
ARG REACT_APP_API_BASE_URL=/api
ARG REACT_APP_ENABLE_ADMIN=1
ARG GENERATE_SOURCEMAP=false

# Set environment variables for the build
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_ENABLE_ADMIN=$REACT_APP_ENABLE_ADMIN
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose port
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
