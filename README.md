# FinFlow — Gestão Financeira Pessoal

App PWA de controle financeiro pessoal: receitas, despesas, contas a pagar/receber, metas e relatórios.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (auth + PostgreSQL + RLS)
- **Tailwind CSS** + shadcn/ui
- **Recharts** para gráficos
- **TypeScript** end-to-end

## Setup rápido

### 1. Criar projeto no Supabase

1. Cria conta em [supabase.com](https://supabase.com) e um novo projeto
2. Vai em **SQL Editor** e roda o arquivo `supabase/migrations/001_init.sql`
3. Em **Authentication > Providers**, habilita Email (e Google se quiser social login)
4. Copia as chaves em **Project Settings > API**

### 2. Variáveis de ambiente

Cria um `.env.local` na raiz:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 4. Deploy

Recomendado **Vercel** (grátis): conecta o repositório, adiciona as 2 env vars, deploy automático. PWA funciona out-of-the-box.

## Estrutura

```
src/
├── app/                    # App Router (rotas)
│   ├── dashboard/          # Tela inicial
│   ├── lancamentos/        # Lista de transações
│   ├── contas/             # Contas a pagar/receber
│   ├── metas/              # Orçamentos e metas
│   ├── login/              # Auth
│   └── api/                # Server actions (opcional)
├── components/
│   ├── ui/                 # shadcn primitives
│   ├── tx-row.tsx          # Linha de transação
│   ├── bottom-nav.tsx      # Navegação inferior
│   └── ...
├── lib/
│   ├── supabase/           # Clients (server, client, middleware)
│   ├── format.ts           # fmt BRL, datas
│   └── categories.ts       # Lista de categorias e ícones
└── types/database.ts       # Types gerados do schema
supabase/
└── migrations/
    └── 001_init.sql        # Schema completo
```

## Funcionalidades

- ✅ Dashboard com saldo, receitas/despesas, alertas de contas
- ✅ Lançamentos com busca, filtro por categoria, recorrência
- ✅ Contas a pagar/receber com marcação de pago
- ✅ Metas (orçamentos por categoria + metas de poupança)
- ✅ Relatórios com gráfico de pizza e linha
- ✅ Importação de CSV/OFX (extrato bancário)
- ✅ PWA instalável no celular
- ✅ Dark mode

## Segurança

- **RLS (Row Level Security)** habilitado em todas as tabelas
- Cada usuário só vê os próprios dados (filtragem automática por `user_id = auth.uid()`)
- Cookies HttpOnly para sessão (via `@supabase/ssr`)
- Sem credenciais expostas no client

## Roadmap

- [ ] Importação automática via Open Finance
- [ ] Categorização automática com regras
- [ ] Notificações de vencimento (Web Push)
- [ ] Compartilhamento de despesas em grupo
- [ ] Backup/export em JSON
