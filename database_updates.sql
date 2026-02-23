-- 1. Create profiles table to store extended user data
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  phone text,
  email text,
  role text default 'user' check (role in ('admin', 'user')),
  is_password_reset_required boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS on profiles
alter table public.profiles enable row level security;

-- 1.5 Function to check if current user is admin (non-recursive)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Policies for profiles
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( public.is_admin() );

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check ( public.is_admin() );

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using ( public.is_admin() );

-- 3. Update deliveries table with user_id
alter table public.deliveries add column if not exists user_id uuid references auth.users(id);

-- Migration: If you have existing data, you might want to assign them to an admin
-- update public.deliveries set user_id = 'YOUR_ADMIN_ID_HERE' where user_id is null;

-- Update RLS for deliveries to ensure isolation
drop policy if exists "Allow generic access" on public.deliveries;
drop policy if exists "Users can only access their own deliveries" on public.deliveries;
create policy "Users can only access their own deliveries"
  on public.deliveries for all
  using ( auth.uid() = user_id );

-- 4. Update app_settings table with user_id
alter table public.app_settings add column if not exists user_id uuid references auth.users(id);

-- Update RLS for settings
drop policy if exists "Allow generic access settings" on public.app_settings;
drop policy if exists "Users can only access their own settings" on public.app_settings;
create policy "Users can only access their own settings"
  on public.app_settings for all
  using ( auth.uid() = user_id );

-- 5. Trigger to automatically create a profile record when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- IMPORTANT: Run this SQL in your Supabase SQL Editor.
-- After running, manually set your first user as 'admin' in the profiles table.

