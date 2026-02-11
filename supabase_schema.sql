-- Create Deliveries Table
create table if not exists deliveries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  delivery_date date not null,
  sand_type text not null,
  volume numeric not null default 0,
  unit_price numeric not null default 0,
  gross_amount numeric not null,
  management_share numeric not null default 0,
  partner_share numeric not null default 0,
  agent_commission numeric not null default 0,
  management_net numeric not null default 0,
  client text not null,
  payment_date date,
  commission_rate numeric not null default 0,
  commission_amount numeric not null default 0,
  net_amount numeric not null,
  truck_number text not null,
  notes text,
  payment_status text default 'Pending'
);

-- Enable Row Level Security (RLS) - Optional for now but good practice
alter table deliveries enable row level security;

-- Policy to allow anonymous read/write (for development simplicity, secure later)
create policy "Allow generic access" on deliveries for all using (true);

-- Payments Table (Multi-tranche)
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  delivery_id uuid references deliveries(id) on delete cascade not null,
  amount numeric not null,
  payment_date date not null,
  method text not null,
  reference text,
  notes text,
  user_id uuid references auth.users(id)
);

-- Enable RLS for payments
alter table payments enable row level security;
create policy "Allow generic access payments" on payments for all using (true);

-- Settings Table (for global app settings)
create table if not exists app_settings (
  id uuid default gen_random_uuid() primary key,
  default_commission_rate numeric default 35,
  currency_symbol text default 'GNF',
  custom_sand_types text[] default '{}',
  granite_prices jsonb default '{}',
  payment_methods text[] default '{}'
);

alter table app_settings enable row level security;
create policy "Allow generic access settings" on app_settings for all using (true);

-- Insert default settings if not exists
insert into app_settings (default_commission_rate, currency_symbol, custom_sand_types, granite_prices, payment_methods)
select 35, 'GNF', 
  ARRAY['0/10', '4/8', '0/4', '8/16', '16/25'],
  '{"0/10": 220000, "4/8": 220000, "0/4": 220000, "8/16": 230000, "16/25": 220000}'::jsonb,
  ARRAY['Espèces', 'Orange Money', 'Virement', 'Chèque']
where not exists (select 1 from app_settings);
