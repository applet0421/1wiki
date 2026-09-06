FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start"]
