FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

# Criar diretório para assets
RUN mkdir -p assets

# Comando para iniciar o bot
CMD ["npm", "start"]
