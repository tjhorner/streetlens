### Backend build ###

FROM node:current-alpine AS build-backend

WORKDIR /usr/src/app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node backend/package.json ./backend/
RUN npm ci --workspace backend
COPY --chown=node:node backend ./backend
RUN npm run build --workspace backend
RUN npm ci --omit=dev --workspace backend && npm cache clean --force && mkdir -p backend/node_modules

ENV NODE_ENV=production

### Frontend build ###

FROM node:current-alpine AS build-frontend

WORKDIR /usr/src/app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node frontend/package.json ./frontend/
RUN npm ci --workspace frontend
COPY --chown=node:node frontend ./frontend
RUN npm run build --workspace frontend

### Production image ###

FROM node:current-alpine

RUN apk add --no-cache pipx ffmpeg git mesa-va-gallium
ARG MAPILLARY_TOOLS_SOURCE=git+https://github.com/tjhorner/mapillary_tools
RUN pipx install "$MAPILLARY_TOOLS_SOURCE"
RUN pipx install apprise
ENV PATH="$PATH:/root/.local/bin"

WORKDIR /usr/src/app

# Dependencies are split between the hoisted root node_modules and backend/node_modules
COPY --chown=node:node --from=build-backend /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-backend /usr/src/app/backend/node_modules ./backend/node_modules
COPY --chown=node:node --from=build-backend /usr/src/app/backend/package.json ./backend/
COPY --chown=node:node --from=build-backend /usr/src/app/backend/dist ./backend/dist

# Copy frontend build
COPY --chown=node:node --from=build-frontend /usr/src/app/frontend/build /usr/src/app/www

ENV FRONTEND_ROOT=/usr/src/app/www
ENV NODE_ENV=production

# Start the server using the production build
CMD [ "node", "backend/dist/main.js" ]
