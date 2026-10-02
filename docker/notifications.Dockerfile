FROM node:22-alpine
WORKDIR /app
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/notifications/package.json apps/notifications/
COPY packages/shared/package.json packages/shared/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci

COPY packages packages
COPY apps/notifications apps/notifications
RUN npm run build -w @churchy/contracts \
 && npm run build -w @churchy/notifications

ENV NODE_ENV=production
WORKDIR /app/apps/notifications
CMD ["node", "dist/main"]
