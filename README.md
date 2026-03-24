# SINTEGRA SaaS

Aplicação web SaaS para geração de arquivos SINTEGRA (Convênio ICMS 57/95) a partir de XMLs de NF-e (modelo 55) e NFC-e (modelo 65).

## Stack

- **Backend:** Node.js + Express + Prisma (SQLite) + JWT
- **Frontend:** React + Vite + Tailwind CSS

## Pré-requisitos

- Node.js 18+
- npm 9+

## Instalação e execução

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

O backend sobe em `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173`.

## Acesso inicial

| Campo | Valor |
|-------|-------|
| Email | neymar.messias@facilsistemas.com.br |
| Senha | Assi2030@# |
| Role  | MASTER |

## Perfis de usuário

| Role   | Permissões |
|--------|-----------|
| MASTER | Cadastra empresas e admins, vê todas as gerações |
| ADMIN  | Gerencia usuários da própria empresa, gera SINTEGRA |
| USER   | Gera SINTEGRA da própria empresa |

## Fluxo de uso

1. MASTER faz login e cadastra empresas (com usuário ADMIN inicial)
2. ADMIN da empresa faz login e pode criar usuários adicionais
3. Qualquer usuário logado acessa **Gerar SINTEGRA**:
   - Seleciona o período
   - Faz upload dos XMLs por tipo (Entrada 55 / Saída 55 / Saída 65)
   - Clica em **Gerar** e aguarda
   - Faz download do arquivo `.txt` gerado

## Registros SINTEGRA gerados

| Tipo | Fonte | Descrição |
|------|-------|-----------|
| 10 | Dados da empresa | Mestre do estabelecimento |
| 11 | Dados da empresa | Dados complementares |
| 50 | NF-e mod 55 | Total da nota por CFOP |
| 54 | NF-e mod 55 | Itens/produtos da nota |
| 60M | NFC-e mod 65 | Mestre de cupom (por dia/série) |
| 60A | NFC-e mod 65 | Analítico por alíquota |
| 75 | Todos os XMLs | Cadastro de produtos |
| 90 | — | Totalizador geral |

## Estrutura do projeto

```
Gera-Sintegra/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite SPA
├── python_legacy/    # Código Python original (referência)
└── xml_*/            # Exemplos de XMLs para testes
```
