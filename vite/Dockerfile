# Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve static dist + shared leaderboard API
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server ./server

RUN mkdir -p /data

ENV PORT=80
ENV DIST_DIR=/app/dist
ENV SCORES_FILE=/data/scores.json

VOLUME /data
EXPOSE 80
CMD ["node", "server/index.mjs"]
