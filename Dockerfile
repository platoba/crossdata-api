FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src/ ./src/
COPY web/ ./web/

RUN npm run build

EXPOSE 3500

CMD ["node", "dist/index.js"]
