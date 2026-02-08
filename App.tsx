import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, Truck, History, PlusCircle, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { Delivery, AppSettings, SandCategory } from './types';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import DeliveryForm from './components/DeliveryForm';
import DeliveryTable from './components/DeliveryTable';
import SettingsView from './components/SettingsView';

const SETTINGS_KEY = 'sand_app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultCommissionRate: 35,
  customSandTypes: [SandCategory.ZERO_FORTY, SandCategory.EIGHT_SIXTEEN, SandCategory.FOUR_EIGHT, SandCategory.OTHER],
  currencySymbol: 'GNF',
  paymentMethods: ['Espèces', 'Orange Money', 'Virement', 'Chèque']
};

const App: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'add' | 'settings'>('dashboard');
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching settings:', error);
      } else if (data) {
        setSettings({
          defaultCommissionRate: data.default_commission_rate,
          currencySymbol: data.currency_symbol,
          customSandTypes: data.custom_sand_types || [],
          paymentMethods: data.payment_methods || []
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err);
    }
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const { data: existing } = await supabase.from('app_settings').select('id').single();

      const settingsToSync = {
        default_commission_rate: newSettings.defaultCommissionRate,
        currency_symbol: newSettings.currencySymbol,
        custom_sand_types: newSettings.customSandTypes,
        payment_methods: newSettings.paymentMethods
      };

      let error;
      if (existing) {
        ({ error } = await supabase.from('app_settings').update(settingsToSync).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('app_settings').insert([settingsToSync]));
      }

      if (error) throw error;

      setSettings(newSettings);

      alert('Paramètres enregistrés avec succès !');
      window.location.reload(); // Refresh to ensure all components see new settings
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erreur lors de la sauvegarde des paramètres.');
    }
  };

  // Fetch Deliveries from Supabase
  const fetchDeliveries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          payments (*)
        `)
        .order('delivery_date', { ascending: false });

      if (error) {
        console.error('Error fetching deliveries:', error);
      } else {
        setDeliveries(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, []);

  // Fetch initial data
  const initApp = useCallback(async () => {
    setIsLoading(true);
    await fetchSettings();
    await fetchDeliveries();
    setIsLoading(false);
  }, [fetchSettings, fetchDeliveries]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleAddDelivery = async (delivery: Delivery, initialPayment?: { amount: number, method: string }) => {
    try {
      if (editingDelivery) {
        // Update existing
        const { error } = await supabase
          .from('deliveries')
          .update({
            delivery_date: delivery.delivery_date,
            sand_type: delivery.sand_type,
            client: delivery.client,
            gross_amount: delivery.gross_amount,
            commission_rate: delivery.commission_rate,
            commission_amount: delivery.commission_amount,
            net_amount: delivery.net_amount,
            truck_number: delivery.truck_number,
            notes: delivery.notes
          })
          .eq('id', editingDelivery.id);

        if (error) throw error;
        await fetchDeliveries(); // Refresh to get correct data/payments
        setEditingDelivery(null);
      } else {
        // Create new
        const { id, ...dataToInsert } = delivery;
        const { data: newDelivery, error: deliveryError } = await supabase
          .from('deliveries')
          .insert([dataToInsert])
          .select()
          .single();

        if (deliveryError) throw deliveryError;

        // If there's an initial payment, insert it
        if (initialPayment && newDelivery) {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([{
              delivery_id: newDelivery.id,
              amount: initialPayment.amount,
              method: initialPayment.method,
              payment_date: newDelivery.delivery_date // Use delivery date as payment date by default
            }]);

          if (paymentError) throw paymentError;
        }

        await fetchDeliveries();
      }
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet enregistrement ?')) {
      try {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw error;
        setDeliveries(prev => prev.filter(d => d.id !== id));
      } catch (error) {
        console.error('Error deleting:', error);
        alert('Erreur lors de la suppression.');
      }
    }
  };

  const handleEditDelivery = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setActiveTab('add');
  };

  const stats = useMemo(() => {
    const initial = {
      totalGross: 0,
      totalCommission: 0,
      totalNetTheoretical: 0, // Montant total facturé aux clients après comm
      totalEncaisse: 0,       // Montant réellement reçu en caisse
      totalDebt: 0,           // Ce qui reste à recouvrer
      invoiceCount: deliveries.length
    };

    return deliveries.reduce((acc, curr) => {
      acc.totalGross += curr.gross_amount;
      acc.totalCommission += curr.commission_amount;
      acc.totalNetTheoretical += curr.net_amount;

      const paid = curr.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      acc.totalEncaisse += paid;

      const remaining = curr.gross_amount - paid;
      if (remaining > 0) acc.totalDebt += remaining;

      return acc;
    }, initial);
  }, [deliveries]);

  // Map theoretical stats to the FinancialStats interface expected by Dashboard
  const mappedStats = useMemo(() => ({
    totalGross: stats.totalGross,
    totalCommission: stats.totalCommission,
    totalNet: stats.totalEncaisse, // For the Dashboard "Net" card, we show what's actually collected
    totalDebt: stats.totalDebt,
    invoiceCount: stats.invoiceCount,
    totalNetTheoretical: stats.totalNetTheoretical // Extra info
  }), [stats]);

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); if (id !== 'add') setEditingDelivery(null); }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === id
        ? 'bg-amber-600 text-white shadow-lg shadow-amber-200/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-amber-500" />
          <span className="font-bold text-lg">SandLogix</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:sticky top-0 left-0 z-40 w-64 h-full md:h-screen bg-slate-900 text-white p-6 flex flex-col gap-8 transition-transform duration-300 ease-in-out
      `}>
        <div className="hidden md:flex items-center gap-3">
          <Truck className="w-8 h-8 text-amber-500" />
          <h1 className="text-xl font-bold tracking-tight">SandLogix</h1>
        </div>

        <div className="flex flex-col gap-2">
          <NavItem id="dashboard" label="Tableau de Bord" icon={LayoutDashboard} />
          <NavItem id="history" label="Historique" icon={History} />
          <NavItem id="add" label={editingDelivery ? "Modifier" : "Nouvelle Saisie"} icon={PlusCircle} />
          <NavItem id="settings" label="Paramètres" icon={SettingsIcon} />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800 text-slate-500 text-xs flex flex-col gap-1">
          <p>SandLogix Mobile Ready</p>
          <p>v1.2.0 - Gestion Tranches</p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8">
        <header className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Aperçu Global'}
            {activeTab === 'history' && 'Historique des Livraisons'}
            {activeTab === 'add' && (editingDelivery ? 'Modifier la Livraison' : 'Nouvelle Livraison')}
            {activeTab === 'settings' && 'Configuration App'}
          </h2>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard deliveries={deliveries} stats={mappedStats} />}

          {activeTab === 'history' && (
            <DeliveryTable
              deliveries={deliveries}
              settings={settings}
              onDelete={handleDeleteDelivery}
              onEdit={handleEditDelivery}
              onRefresh={fetchDeliveries}
            />
          )}

          {activeTab === 'add' && (
            <div className="max-w-2xl bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <DeliveryForm
                onSubmit={handleAddDelivery}
                initialData={editingDelivery || undefined}
                onCancel={() => setActiveTab('history')}
                settings={settings}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsView settings={settings} onSave={handleSaveSettings} />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-amber-600' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-600' : 'text-slate-400'}`}>
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">Historique</span>
        </button>
        <button
          onClick={() => { setActiveTab('add'); setEditingDelivery(null); }}
          className="flex flex-col items-center justify-center -mt-8 bg-amber-600 text-white w-12 h-12 rounded-full shadow-lg shadow-amber-200 border-4 border-white"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-amber-600' : 'text-slate-400'}`}>
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Paramètres</span>
        </button>
      </div>
    </div>
  );
};

export default App;
