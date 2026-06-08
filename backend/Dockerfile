
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Run build if using TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
