# Production image for the Outwit WebSocket server.
# The server is a single bundled Node file (esbuild) that depends only on `ws`
# at runtime, so the image stays small and starts instantly.
#
# Deploy on Northflank with:
#   build:  (dockerfile) /Dockerfile
#   port:   3001, public
#   start:  node server/dist/index.js

# --- build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install all dependencies (needs dev deps for esbuild).
COPY package.json package-lock.json ./
RUN npm ci

# Bundle the server (inlines src/engine, externalizes ws).
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY server ./server
RUN npm run build:server

# --- runtime stage -----------------------------------------------------------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only (ws).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The bundled server.
COPY --from=build /app/server/dist ./server/dist

# Render/Northflank inject PORT; default matches local development.
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
