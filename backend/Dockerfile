FROM node:20-alpine

WORKDIR /app

# Instala dependências nativas necessárias (Prisma, node-unrar-js WASM)
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY server.js ./

# Cria a pasta de uploads (volume montado em produção)
RUN mkdir -p uploads/tmp

EXPOSE 3001

# Aplica migrações e inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
