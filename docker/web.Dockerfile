FROM node:22-alpine
WORKDIR /app
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/notifications/package.json apps/notifications/
COPY packages/shared/package.json packages/shared/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci

# Inlinée dans le JavaScript du navigateur au build : à fournir en build arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY packages packages
COPY apps/web apps/web
RUN npm run build -w @churchy/shared \
 && npm run build -w @churchy/web

ENV NODE_ENV=production PORT=3200
WORKDIR /app/apps/web
EXPOSE 3200
CMD ["npm", "run", "start"]
