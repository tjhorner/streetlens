### Backend build ###

FROM node:current-alpine AS build-backend

WORKDIR /usr/src/app

COPY --chown=node:node backend/package*.json ./
RUN npm ci
COPY --chown=node:node backend .
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

ENV NODE_ENV=production

### Frontend build ###

FROM node:current-alpine AS build-frontend

WORKDIR /usr/src/app

COPY --chown=node:node frontend/package*.json ./
RUN npm ci
COPY --chown=node:node frontend .
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

### Production image ###

FROM node:current-alpine

RUN apk add pipx ffmpeg git
RUN pipx install git+https://github.com/juanmcasillas/gopro2gpx
RUN pipx install git+https://github.com/tjhorner/mapillary_tools
RUN pipx install apprise
ENV PATH="$PATH:/root/.local/bin"

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build-backend /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-backend /usr/src/app/dist ./dist

# Copy frontend build
COPY --chown=node:node --from=build-frontend /usr/src/app/build /usr/src/app/www

ENV FRONTEND_ROOT=/usr/src/app/www
ENV NODE_ENV=production

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
