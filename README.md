# SINTEGRA SaaS

Aplicacao web para geracao de arquivos SINTEGRA (Convenio ICMS 57/95) a partir de XMLs de NF-e (modelo 55) e NFC-e (modelo 65).

## Stack

- Backend: Node.js 24 + Express + Prisma + MySQL + JWT
- Frontend: React + Vite + Tailwind CSS
- Infra: Docker Compose + Nginx + MySQL `mysql:9.6.0`

## Deploy na VPS

Este projeto nao usa mais GitHub Actions para build ou deploy. O fluxo esperado e:

```bash
git clone <repo>
cd Gera-Sintegra
cp .env.example .env
docker compose up -d --build
```

### Pre-requisitos

- Docker e Docker Compose instalados na VPS
- Rede Docker externa `shared-network` ja criada
- Nginx raiz da VPS rodando em container e conectado a `shared-network`
- Acesso a imagem publica `mysql:9.6.0`

Crie a rede externa uma unica vez, se ainda nao existir:

```bash
docker network create shared-network
```

### Roteamento esperado no Nginx raiz

- `/` -> container `frontend` na porta `80`
- `/api` -> container `backend` na porta `3001`

O frontend continua consumindo a API em `/api`. Nenhuma porta da aplicacao e publicada diretamente no host pelo `docker-compose.yml`.

## Variaveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```env
JWT_SECRET=troque-por-uma-chave-segura-longa-e-aleatoria
FRONTEND_URL=https://seudominio.com.br
MYSQL_ROOT_PASSWORD=senha-root-forte-aqui
MYSQL_PASSWORD=senha-usuario-sintegra-aqui
```

## Desenvolvimento local

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

Backend em `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173`.

## Estrutura do projeto

```text
Gera-Sintegra/
|-- backend/        # API Node.js + Express + Prisma
|-- frontend/       # SPA React + Vite
|-- python_legacy/  # Implementacao Python original
`-- xml_*/          # XMLs de exemplo para teste
```
