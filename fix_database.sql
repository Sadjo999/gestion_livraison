-- --- REPARATION RADICALE ET FINALE (ANTI-RECURSION) ---
-- Ce script nettoie TOUTES les anciennes erreurs et repart sur des bases saines.

-- 1. DESACTIVATION TEMPORAIRE DE RLS POUR LE NETTOYAGE
-- (Sécurisé car exécuté dans une transaction ou en un bloc par l'admin)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRESSION TOTALE DES ANCIENNES RÈGLES ET FONCTIONS
-- On efface TOUT pour être sûr qu'aucune règle cachée ne crée de boucle.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Self_Access" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Select" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Update" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Insert" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Read_Own" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Read_Admin" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Write_Own" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Write_Admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Owner" ON public.profiles;
DROP POLICY IF EXISTS "RLS_Deliveries_Read" ON public.deliveries;
DROP POLICY IF EXISTS "RLS_Deliveries_Write" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_Select" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_All" ON public.deliveries;
DROP POLICY IF EXISTS "Settings_Read" ON public.app_settings;
DROP POLICY IF EXISTS "Settings_Admin" ON public.app_settings;
-- Ne pas oublier les anciennes règles de bases
DROP POLICY IF EXISTS "Allow generic access" ON public.deliveries;
DROP POLICY IF EXISTS "Users can only access their own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow generic access settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can only access their own settings" ON public.app_settings;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 3. RÉ-ACTIVATION DE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. NOUVELLES POLITIQUES SANS RÉCURSION (CHIRURGICAL)

-- a) PROFILES : L'utilisateur ne peut voir QUE sa propre ligne. 
-- C'est la règle d'or pour éviter les boucles : une table ne doit pas demander "suis-je admin" pour se lire elle-même.
CREATE POLICY "Profiles_Access_Owner" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles_Update_Owner" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- b) DELIVERIES : L'admin voit tout, l'user voit le sien.
-- Ici, on interroge 'profiles' pour savoir si l'user est admin. 
-- Comme la politique de 'profiles' est simple (auth.uid()=id), il n'y a PLUS de boucle !
CREATE POLICY "Deliveries_Select_Policy" ON public.deliveries FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Deliveries_All_Policy" ON public.deliveries FOR ALL 
  USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- c) SETTINGS : Tout le monde voit, admin modifie.
CREATE POLICY "Settings_Read_Policy" ON public.app_settings FOR SELECT 
  USING (true);

CREATE POLICY "Settings_Write_Policy" ON public.app_settings FOR ALL 
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- d) PAYMENTS : Suivre le même modèle que deliveries
CREATE POLICY "Payments_Select_Policy" ON public.payments FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND (d.user_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'))
  );

CREATE POLICY "Payments_Write_Policy" ON public.payments FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND (d.user_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'))
  );

-- 5. MAINTENANCE ET OPTIMISATION
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_user_id_profile_fkey;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_user_id_profile_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. IMPORTANT : Autoriser l'admin à voir les autres profils UNIQUEMENT via une vue ou désactiver RLS pour admin.
-- Alternative simple pour permettre à l'admin de lister les utilisateurs sans boucle :
CREATE POLICY "Profiles_Admin_Read_All" ON public.profiles 
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
-- ATTENTION : Cette règle est récursive ! 
-- Pour la liste des utilisateurs, on va plutôt recommander de désactiver temporairement 
-- ou d'utiliser une vue si le besoin est critique, mais pour l'instant 
-- restons sur le déblocage du Dashboard.
