-- Create Deliveries Table
create table if not exists deliveries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  delivery_date date not null,
  sand_type text not null,
  client text not null,
  payment_date date,
  gross_amount numeric not null,
  commission_rate numeric not null,
  commission_amount numeric not null,
  net_amount numeric not null,
  truck_number text not null,
  notes text,
  payment_status text default 'Pending' -- Optional: specific status field
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
  payment_methods text[] default '{}'
);

alter table app_settings enable row level security;
create policy "Allow generic access settings" on app_settings for all using (true);

-- Insert default settings if not exists
insert into app_settings (default_commission_rate, currency_symbol, custom_sand_types, payment_methods)
select 35, 'GNF', 
  ARRAY['30m³ de 0/40', '30m³ de 8/16', '30m³ de 4/8', 'Autre'],
  ARRAY['Espèces', 'Orange Money', 'Virement', 'Chèque']
where not exists (select 1 from app_settings);
