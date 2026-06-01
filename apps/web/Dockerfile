# Etapa de Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copiar o restante e compilar
COPY . .
RUN npm run build

# Etapa de Produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar arquivos necessários da etapa de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000

CMD ["npm", "start"]
