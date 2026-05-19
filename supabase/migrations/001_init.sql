-- ============================================================
-- FinFlow — Schema inicial
-- ============================================================
-- Roda esse arquivo no SQL Editor do Supabase.
-- Cria todas as tabelas, índices, políticas RLS e seeds.
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Categorias (customizáveis por usuário, com algumas padrão)
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'ti-tag',
  color text not null default '#5F5E5A',
  type text not null check (type in ('receita', 'despesa', 'ambos')),
  is_default boolean default false,
  created_at timestamptz default now()
);

create index idx_categories_user on public.categories(user_id);

-- Transações (receitas e despesas)
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('receita', 'despesa')),
  date date not null,
  is_recurring boolean default false,
  recurrence_id uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_category on public.transactions(category_id);

-- Contas a pagar/receber
create table if not exists public.bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  due_date date not null,
  type text not null check (type in ('pagar', 'receber')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'late')),
  paid_at timestamptz,
  is_recurring boolean default false,
  recurrence_id uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_bills_user_status on public.bills(user_id, status);
create index idx_bills_due on public.bills(due_date);

-- Recorrências (template para gerar transações/contas mensais)
create table if not exists public.recurrences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('receita', 'despesa', 'pagar', 'receber')),
  day_of_month int not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  active boolean default true,
  created_at timestamptz default now()
);

create index idx_recurrences_user on public.recurrences(user_id, active);

-- Metas (orçamentos por categoria e metas de poupança)
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) default 0,
  period text default 'monthly' check (period in ('monthly', 'yearly', 'total')),
  type text not null default 'budget' check (type in ('budget', 'savings')),
  start_date date default current_date,
  end_date date,
  created_at timestamptz default now()
);

create index idx_goals_user on public.goals(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_transactions_updated
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger trg_bills_updated
  before update on public.bills
  for each row execute function public.set_updated_at();

-- Marca contas vencidas como 'late' automaticamente (via cron ou edge function)
create or replace function public.mark_late_bills()
returns void as $$
begin
  update public.bills
  set status = 'late'
  where status = 'pending' and due_date < current_date;
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.recurrences enable row level security;
alter table public.goals enable row level security;

-- Categories
create policy "users see own categories" on public.categories
  for select using (auth.uid() = user_id);
create policy "users insert own categories" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "users update own categories" on public.categories
  for update using (auth.uid() = user_id);
create policy "users delete own categories" on public.categories
  for delete using (auth.uid() = user_id and is_default = false);

-- Transactions
create policy "users see own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "users insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "users update own transactions" on public.transactions
  for update using (auth.uid() = user_id);
create policy "users delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- Bills
create policy "users see own bills" on public.bills
  for select using (auth.uid() = user_id);
create policy "users insert own bills" on public.bills
  for insert with check (auth.uid() = user_id);
create policy "users update own bills" on public.bills
  for update using (auth.uid() = user_id);
create policy "users delete own bills" on public.bills
  for delete using (auth.uid() = user_id);

-- Recurrences
create policy "users see own recurrences" on public.recurrences
  for select using (auth.uid() = user_id);
create policy "users insert own recurrences" on public.recurrences
  for insert with check (auth.uid() = user_id);
create policy "users update own recurrences" on public.recurrences
  for update using (auth.uid() = user_id);
create policy "users delete own recurrences" on public.recurrences
  for delete using (auth.uid() = user_id);

-- Goals
create policy "users see own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy "users insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "users update own goals" on public.goals
  for update using (auth.uid() = user_id);
create policy "users delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

-- ============================================================
-- SEED: categorias padrão criadas automaticamente para novo usuário
-- ============================================================

create or replace function public.create_default_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, icon, color, type, is_default) values
    (new.id, 'Mercado',      'ti-shopping-cart', '#D85A30', 'despesa', true),
    (new.id, 'Transporte',   'ti-bus',           '#185FA5', 'despesa', true),
    (new.id, 'Lazer',        'ti-popcorn',       '#D4537E', 'despesa', true),
    (new.id, 'Casa',         'ti-home',          '#7F77DD', 'despesa', true),
    (new.id, 'Saúde',        'ti-heartbeat',     '#1D9E75', 'despesa', true),
    (new.id, 'Educação',     'ti-book',          '#534AB7', 'despesa', true),
    (new.id, 'Salário',      'ti-cash',          '#639922', 'receita', true),
    (new.id, 'Freelance',    'ti-briefcase',     '#BA7517', 'receita', true),
    (new.id, 'Investimento', 'ti-trending-up',   '#0F6E56', 'ambos',   true),
    (new.id, 'Outros',       'ti-dots',          '#5F5E5A', 'ambos',   true);
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_new_user_categories
  after insert on auth.users
  for each row execute function public.create_default_categories();

-- ============================================================
-- VIEWS para dashboard (opcional, agiliza queries)
-- ============================================================

create or replace view public.monthly_summary as
select
  user_id,
  date_trunc('month', date)::date as month,
  type,
  sum(amount) as total,
  count(*) as count
from public.transactions
group by user_id, date_trunc('month', date), type;

-- Aplicar RLS na view via security_invoker
alter view public.monthly_summary set (security_invoker = true);
