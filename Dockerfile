FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start"]
