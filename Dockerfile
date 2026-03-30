# aurum/Dockerfile

# ── Stage 1: deps ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

ENV NODE_OPTIONS="--max_old_space_size=2048"
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# ── Stage 3: production (serve with nginx) ─────────
FROM nginx:1.27-alpine AS production
# react-scripts build outputs to "build" folder
COPY --from=builder /app/build /usr/share/nginx/html
# SPA fallback: all routes → index.html
RUN printf 'server {\n  listen 4001;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 4001
CMD ["nginx", "-g", "daemon off;"]
