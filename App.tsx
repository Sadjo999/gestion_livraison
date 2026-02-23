import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, Truck, History, PlusCircle, Settings as SettingsIcon, Menu, X, Users as UsersIcon, LogOut, AlertCircle, User } from 'lucide-react';
import { Delivery, AppSettings, Profile } from './types';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import DeliveryForm from './components/DeliveryForm';
import DeliveryTable from './components/DeliveryTable';
import SettingsView from './components/SettingsView';
import Auth from './components/Auth';
import UserManagement from './components/UserManagement';
import ProfileSettings from './components/ProfileSettings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultCommissionRate: 35,
  customSandTypes: ['0/10', '4/8', '0/4', '8/16', '16/25'],
  granitePrices: {
    '0/10': 220000,
    '4/8': 220000,
    '0/4': 220000,
    '8/16': 230000,
    '16/25': 220000
  },
  currencySymbol: 'GNF',
  otherFees: 0,
  paymentMethods: ['Espèces', 'Orange Money', 'Virement', 'Chèque']
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'add' | 'settings' | 'users' | 'profile'>('dashboard');
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setIsLoading(false);
      setProfile(null);
      return null;
    }
    if (data) {
      setProfile(data);
      return data;
    }
    return null;
  }, []);

  const fetchAllProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all profiles:', error);
    } else if (data) {
      setAllProfiles(data);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setSettings({
          id: data.id,
          user_id: data.user_id,
          defaultCommissionRate: data.default_commission_rate,
          currencySymbol: data.currency_symbol,
          customSandTypes: data.custom_sand_types || [],
          granitePrices: data.granite_prices || DEFAULT_SETTINGS.granitePrices,
          paymentMethods: data.payment_methods || [],
          otherFees: Number(data.other_fees || 0)
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const fetchDeliveries = useCallback(async (userId: string, role?: string, authUid?: string) => {
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          payments (*),
          profiles:user_id (*)
        `)
        .order('delivery_date', { ascending: false });

      if (role !== 'admin' || (authUid && userId !== authUid)) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (data) setDeliveries(data);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    }
  }, []);

  const loadData = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const profileData = await fetchProfile(uid);

      const promises: Promise<any>[] = [
        fetchSettings(),
        fetchDeliveries(selectedUserId || uid, profileData?.role, uid)
      ];

      if (profileData?.role === 'admin') {
        promises.push(fetchAllProfiles());
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile, fetchSettings, fetchDeliveries, fetchAllProfiles, selectedUserId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setDeliveries([]);
      }
    });

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    loadData(session.user.id);

    // Real-time subscription for deliveries
    const deliverySub = supabase
      .channel('deliveries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        if (session?.user?.id && profile?.role) {
          fetchDeliveries(selectedUserId || session.user.id, profile?.role, session.user.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deliverySub);
    };
  }, [session?.user?.id, profile?.role, selectedUserId, fetchDeliveries, loadData]);



  const handleSaveSettings = async (newSettings: AppSettings) => {
    if (!session?.user?.id) return;
    try {
      const settingsToSync = {
        user_id: session.user.id,
        default_commission_rate: newSettings.defaultCommissionRate,
        currency_symbol: newSettings.currencySymbol,
        custom_sand_types: newSettings.customSandTypes,
        granite_prices: newSettings.granitePrices,
        payment_methods: newSettings.paymentMethods,
        other_fees: newSettings.otherFees
      };

      let error;
      if (settings.id) {
        ({ error } = await supabase.from('app_settings').update(settingsToSync).eq('id', settings.id));
      } else {
        ({ error } = await supabase.from('app_settings').insert([settingsToSync]));
      }

      if (error) throw error;
      setSettings({ ...newSettings, id: settings.id });
      alert('Paramètres enregistrés avec succès !');
      // No reload needed now as we use state effectively
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erreur lors de la sauvegarde des paramètres.');
    }
  };

  const handleAddDelivery = async (delivery: Delivery, initialPayment?: { amount: number, method: string }) => {
    if (!session?.user?.id) return;
    try {
      if (editingDelivery) {
        const { error } = await supabase
          .from('deliveries')
          .update({
            ...delivery,
            user_id: session.user.id
          })
          .eq('id', editingDelivery.id);

        if (error) throw error;
        setEditingDelivery(null);
      } else {
        // Remove id and created_at if they exist to let Supabase handle them
        const { id, ...deliveryPayload } = delivery;

        const { data: newDelivery, error: deliveryError } = await supabase
          .from('deliveries')
          .insert([{
            ...deliveryPayload,
            user_id: session.user.id
          }])
          .select()
          .single();

        if (deliveryError) throw deliveryError;

        if (initialPayment && newDelivery) {
          await supabase.from('payments').insert([{
            delivery_id: newDelivery.id,
            amount: initialPayment.amount,
            method: initialPayment.method,
            payment_date: newDelivery.delivery_date
          }]);
        }
      }
      await fetchDeliveries(selectedUserId || session.user.id, profile?.role, session.user.id);
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Erreur lors de la sauvegarde.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const stats = useMemo(() => {
    const initial = {
      totalGross: 0,
      totalCommission: 0,
      totalPartner: 0,
      totalManagementShare: 0,
      totalNetTheoretical: 0,
      totalEncaisse: 0,
      totalDebt: 0,
      invoiceCount: deliveries.length,
      totalOtherFees: 0
    };

    return deliveries.reduce((acc, curr) => {
      acc.totalGross += curr.gross_amount;
      acc.totalCommission += curr.agent_commission || 0;
      acc.totalPartner += curr.partner_share || 0;
      acc.totalManagementShare += curr.management_share || 0;
      acc.totalOtherFees += curr.other_fees || 0;
      acc.totalNetTheoretical += curr.management_net || 0;

      const paid = curr.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      acc.totalEncaisse += paid;
      const remaining = curr.gross_amount - paid;
      if (remaining > 0) acc.totalDebt += remaining;

      return acc;
    }, initial);
  }, [deliveries]);

  const mappedStats = useMemo(() => ({
    totalGross: stats.totalGross,
    totalCommission: stats.totalCommission,
    totalNet: stats.totalEncaisse,
    totalDebt: stats.totalDebt,
    invoiceCount: stats.invoiceCount,
    totalNetTheoretical: stats.totalNetTheoretical,
    totalPartner: stats.totalPartner,
    totalManagementShare: stats.totalManagementShare,
    totalOtherFees: stats.totalOtherFees
  }), [stats]);

  if (!session) {
    return <Auth onSession={setSession} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profile?.is_password_reset_required) {
    return <Auth onSession={setSession} initialResetRequired={true} />;
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">Compte Suspendu</h1>
            <p className="text-slate-500">Votre accès a été temporairement désactivé par l'administrateur. Veuillez contacter le support pour plus d'informations.</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all font-inter"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  const NavItem: React.FC<{ id: any, label: string, icon: any }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); if (id !== 'add') setEditingDelivery(null); }}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${activeTab === id
        ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 translate-x-1'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'text-slate-500'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-inter">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-premium text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-amber-500" />
          <span className="font-black text-lg tracking-tight font-lexend">GranitLogix</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-1">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:sticky top-0 left-0 z-40 w-72 h-full md:h-screen bg-gradient-premium text-white p-6 flex flex-col gap-10 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl overflow-y-auto
      `}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <Truck className="text-slate-800 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight font-lexend leading-none">GranitLogix</h1>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.1em] mt-1">Gestion de Livraison</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <NavItem id="dashboard" label="Tableau de Bord" icon={LayoutDashboard} />
          <NavItem id="history" label="Historique" icon={History} />
          <NavItem id="add" label={editingDelivery ? "Modifier" : "Nouvelle Saisie"} icon={PlusCircle} />
          {profile?.role === 'admin' && (
            <>
              <div className="h-px bg-slate-800/50 my-2 mx-2"></div>
              <NavItem id="settings" label="Paramètres" icon={SettingsIcon} />
              <NavItem id="users" label="Utilisateurs" icon={UsersIcon} />
            </>
          )}
          <NavItem id="profile" label="Mon Profil" icon={User} />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800/60 flex flex-col gap-4 shrink-0">
          <div className="premium-glass p-4 rounded-2xl mb-2">
            <p className="text-xs font-bold text-amber-500 mb-1">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-0 md:p-0 relative bg-slate-50">
        <div className="max-w-7xl mx-auto p-4 md:p-10 pb-28 md:pb-10">
          {/* Simplified Tab Content */}
          <div className="animate-slide-up">
            <header className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 font-lexend tracking-tight">
                {activeTab === 'dashboard' && 'Tableau de Bord'}
                {activeTab === 'history' && 'Journal des Livraisons'}
                {activeTab === 'add' && (editingDelivery ? 'Modification' : 'Nouvelle Livraison')}
                {activeTab === 'settings' && 'Paramètres'}
                {activeTab === 'users' && 'Gestion Utilisateurs'}
                {activeTab === 'profile' && 'Mon Profil'}
              </h2>
              <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            </header>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {activeTab === 'dashboard' && (
              <Dashboard
                deliveries={deliveries}
                stats={mappedStats}
                profiles={profile?.role === 'admin' ? allProfiles : undefined}
                onUserFilter={setSelectedUserId}
                selectedUserId={selectedUserId}
              />
            )}
            {activeTab === 'history' && (
              <DeliveryTable
                deliveries={deliveries}
                settings={settings}
                onDelete={(id) => supabase.from('deliveries').delete().eq('id', id).then(() => fetchDeliveries(selectedUserId || session.user.id, profile?.role, session.user.id))}
                onEdit={(d) => { setEditingDelivery(d); setActiveTab('add'); }}
                onRefresh={() => fetchDeliveries(selectedUserId || session.user.id, profile?.role, session.user.id)}
                profile={
                  profile?.role === 'admin' && selectedUserId
                    ? allProfiles.find(p => p.id === selectedUserId) || profile
                    : profile || undefined
                }
              />
            )}
            {activeTab === 'add' && (
              <div className="max-w-2xl premium-card p-6 md:p-8">
                <DeliveryForm
                  onSubmit={handleAddDelivery}
                  initialData={editingDelivery || undefined}
                  onCancel={() => setActiveTab('history')}
                  settings={settings}
                />
              </div>
            )}
            {activeTab === 'settings' && profile?.role === 'admin' && (
              <SettingsView settings={settings} onSave={handleSaveSettings} />
            )}
            {activeTab === 'users' && profile?.role === 'admin' && (
              <UserManagement />
            )}
            {activeTab === 'profile' && profile && (
              <ProfileSettings profile={profile} onUpdate={() => fetchProfile(session.user.id)} />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-amber-600' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stats</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-600' : 'text-slate-400'}`}>
          <History className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button
          onClick={() => { setActiveTab('add'); setEditingDelivery(null); }}
          className="flex flex-col items-center justify-center -mt-10 bg-amber-600 text-white w-14 h-14 rounded-full shadow-xl shadow-amber-900/40 border-4 border-white active:scale-95 transition-transform"
        >
          <PlusCircle className="w-7 h-7" />
        </button>
        {profile?.role === 'admin' ? (
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-amber-600' : 'text-slate-400'}`}>
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-amber-600' : 'text-slate-400'}`}>
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default App;
