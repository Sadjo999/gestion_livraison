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
    <div className="max-w-2xl space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        {/* Financial Defaults */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
            Paramètres Financiers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Commission par Défaut (%)</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={localSettings.defaultCommissionRate}
                onChange={e => setLocalSettings(prev => ({ ...prev, defaultCommissionRate: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Symbole Monétaire</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={localSettings.currencySymbol}
                onChange={e => setLocalSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
            Types de Sable
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: 0/10"
                className="flex-[2] p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newType}
                onChange={e => setNewType(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddType()}
              />
              <button
                onClick={handleAddType}
                className="bg-slate-100 p-2 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
                type="button"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {localSettings.customSandTypes.map(type => (
                <div key={type} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-sm justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="font-bold w-12">{type}</span>
                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                      <input
                        type="number"
                        className="w-full p-1 bg-white border border-slate-200 rounded-lg text-right font-mono"
                        value={localSettings.granitePrices?.[type] || 0}
                        onChange={e => setLocalSettings(prev => ({
                          ...prev,
                          granitePrices: {
                            ...(prev.granitePrices || {}),
                            [type]: Number(e.target.value)
                          }
                        }))}
                      />
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{localSettings.currencySymbol}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveType(type)} className="text-rose-400 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
            Modes de Paiement
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Orange Money"
                className="flex-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newMethod}
                onChange={e => setNewMethod(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMethod()}
              />
              <button
                onClick={handleAddMethod}
                className="bg-slate-100 p-2 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
                type="button"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localSettings.paymentMethods?.map(method => (
                <div key={method} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-sm">
                  <span>{method}</span>
                  <button
                    onClick={() => handleRemoveMethod(method)}
                    className="text-rose-400 hover:text-rose-600"
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
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          Enregistrer les Paramètres
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
        <RefreshCw className="w-5 h-5 shrink-0" />
        <p>L'application s'actualisera après l'enregistrement pour appliquer vos nouveaux réglages partout.</p>
      </div>
    </div>
  );
};

export default SettingsView;
