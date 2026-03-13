# Estágio 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Instala apenas dependências necessárias para o build
COPY package*.json ./
# Usamos ci (Clean Install) que é mais rápido e determinístico
RUN npm ci

COPY . .
RUN npm run build

# Estágio 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia apenas o necessário para rodar
COPY package*.json ./
# Omitir dev dependencies e usar ci ajuda a reduzir consumo de RAM
RUN npm ci --omit=dev --prefer-offline --no-audit --no-fund

COPY --from=builder /app/dist ./dist

# ADICIONE ESTA LINHA ABAIXO:
# Isso copia sua pasta de migrações da raiz do projeto para dentro do container
COPY ./drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/server.js"]