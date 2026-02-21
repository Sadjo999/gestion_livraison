import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, Plus, Trash2, RefreshCw } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsView: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [newType, setNewType] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [hasSync, setHasSync] = useState(false);

  // Initial sync when settings arrive from Prop (Supabase)
  useEffect(() => {
    if (!hasSync && settings.customSandTypes?.length > 0) {
      setLocalSettings(settings);
      setHasSync(true);
    }
  }, [settings, hasSync]);

  const handleAddType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (localSettings.customSandTypes.includes(trimmed)) {
      alert('Ce type existe déjà.');
      return;
    }
    setLocalSettings(prev => ({
      ...prev,
      customSandTypes: [...prev.customSandTypes, trimmed]
    }));
    setNewType('');
  };

  const handleRemoveType = (typeToRemove: string) => {
    setLocalSettings(prev => ({
      ...prev,
      customSandTypes: prev.customSandTypes.filter(t => t !== typeToRemove)
    }));
  };

  const handleAddMethod = () => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    if (localSettings.paymentMethods.includes(trimmed)) {
      alert('Ce mode existe déjà.');
      return;
    }
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: [...(prev.paymentMethods || []), trimmed]
    }));
    setNewMethod('');
  };

  const handleRemoveMethod = (methodToRemove: string) => {
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter(m => m !== methodToRemove)
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className="max-w-4xl space-y-10 animate-slide-up">
      <div className="premium-glass p-8 md:p-12 rounded-[3rem] border border-white/40 shadow-2xl space-y-12">
        {/* Financial Defaults */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-lexend">Configuration Financière</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commission Défaut (%)</label>
              <div className="relative group">
                <input
                  type="number"
                  className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-lexend font-bold text-lg"
                  value={localSettings.defaultCommissionRate || ''}
                  onChange={e => setLocalSettings(prev => ({ ...prev, defaultCommissionRate: e.target.value === '' ? 0 : Number(e.target.value) }))}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Devise Locale</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-lexend font-black text-lg text-center"
                value={localSettings.currencySymbol}
                onChange={e => setLocalSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frais Logistiques Fixes</label>
              <div className="relative group">
                <input
                  type="number"
                  className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-lexend font-bold text-lg"
                  value={localSettings.otherFees || ''}
                  onChange={e => setLocalSettings(prev => ({ ...prev, otherFees: e.target.value === '' ? 0 : Number(e.target.value) }))}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">{localSettings.currencySymbol}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories & Pricing */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-lexend">Matériaux & Tarification</h3>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4 p-2 bg-slate-900/5 rounded-2xl border border-slate-200/50">
              <input
                type="text"
                placeholder="Nouveau type (ex: 0/15, Gravier...)"
                className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                value={newType}
                onChange={e => setNewType(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddType()}
              />
              <button
                onClick={handleAddType}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                type="button"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localSettings.customSandTypes.map(type => (
                <div key={type} className="group flex items-center gap-4 bg-white/40 hover:bg-white border border-slate-200/50 p-4 rounded-2xl transition-all duration-300">
                  <div className="flex-1 flex items-center justify-between gap-6">
                    <span className="font-lexend font-black text-slate-900 text-sm">{type}</span>
                    <div className="flex items-center gap-3">
                      <div className="relative group/price">
                        <input
                          type="number"
                          className="w-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right font-lexend font-bold text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                          value={localSettings.granitePrices?.[type] || 0}
                          onChange={e => setLocalSettings(prev => ({
                            ...prev,
                            granitePrices: {
                              ...(prev.granitePrices || {}),
                              [type]: Number(e.target.value)
                            }
                          }))}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within/price:text-blue-400">{localSettings.currencySymbol}</span>
                      </div>
                      <button onClick={() => handleRemoveType(type)} className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-lexend">Modes de Versement</h3>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4 p-2 bg-slate-900/5 rounded-2xl border border-slate-200/50">
              <input
                type="text"
                placeholder="Ex: Orange Money, Virement..."
                className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                value={newMethod}
                onChange={e => setNewMethod(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMethod()}
              />
              <button
                onClick={handleAddMethod}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                type="button"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              {localSettings.paymentMethods?.map(method => (
                <div key={method} className="group flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 border-b-4 border-b-transparent hover:border-b-emerald-500">
                  <span className="font-bold text-slate-700 text-sm tracking-tight">{method}</span>
                  <button
                    onClick={() => handleRemoveMethod(method)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-4 hover:bg-black transition-all shadow-2xl shadow-slate-300 active:scale-[0.98] transform group font-lexend text-lg uppercase tracking-widest border-t border-white/20"
        >
          <Save className="w-6 h-6 group-hover:scale-125 transition-transform" />
          Mettre à jour la plateforme
        </button>
      </div>

      <div className="bg-white/40 backdrop-blur-md border border-amber-200/50 p-6 rounded-3xl flex gap-4 text-amber-900/80 text-sm shadow-xl shadow-amber-900/5 animate-pulse">
        <div className="p-2 bg-amber-100 rounded-xl h-fit">
          <RefreshCw className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-1">
          <p className="font-black font-lexend uppercase tracking-widest text-[10px]">Note de synchronisation</p>
          <p className="font-medium">L'application se synchronisera automatiquement après l'enregistrement pour diffuser vos nouveaux réglages sur tous les terminaux actifs.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
