FROM node:22-alpine
# openssl : requis par le moteur Prisma sur Alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV HUSKY=0

# Mêmes couches d'installation que web/notifications : le cache Docker les partage.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/notifications/package.json apps/notifications/
COPY packages/shared/package.json packages/shared/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci

COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @churchy/shared -w @churchy/contracts \
 && npm run prisma:generate -w @churchy/api \
 && npm run build -w @churchy/api

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3201
CMD ["node", "dist/main"]
