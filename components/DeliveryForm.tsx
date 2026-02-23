
import React, { useState, useEffect } from 'react';
import { Delivery, AppSettings } from '../types';
import { calculateCommission, calculateNet, formatCurrency, calculateGraniteFinances } from '../utils/finance';
import { Save, X, Calculator, CreditCard } from 'lucide-react';

interface Props {
  onSubmit: (delivery: Delivery, initialPayment?: { amount: number, method: string }) => void;
  initialData?: Delivery;
  onCancel: () => void;
  settings: AppSettings;
}

const DeliveryForm: React.FC<Props> = ({ onSubmit, initialData, onCancel, settings }) => {
  const [formData, setFormData] = useState<Partial<Delivery> & { initial_payment?: number, payment_method?: string }>(() => {
    const defaultSand = settings?.customSandTypes?.[0] || '';
    const defaultMethod = settings?.paymentMethods?.[0] || 'Espèces';

    return {
      delivery_date: new Date().toISOString().split('T')[0],
      sand_type: defaultSand,
      client: '',
      payment_date: '',
      gross_amount: 0,
      commission_rate: settings?.defaultCommissionRate || 35,
      truck_number: '',
      initial_payment: 0,
      payment_method: defaultMethod,
      ...initialData
    };
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [finances, setFinances] = useState({
    grossAmount: 0,
    managementShare: 0,
    partnerShare: 0,
    agentCommission: 0,
    managementNet: 0,
    truckCount: 0,
    otherFees: 0
  });

  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    const unitPrice = settings.granitePrices?.[formData.sand_type || ''] || 0;
    const results = calculateGraniteFinances(formData.volume || 0, unitPrice, formData.commission_rate || 35, settings.otherFees || 0);
    setFinances(results);
    setNetAmount(results.managementNet);
  }, [formData.volume, formData.sand_type, formData.commission_rate, settings.granitePrices, settings.otherFees]);

  const handlePreliminarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.volume) {
      alert("Veuillez remplir les champs obligatoires (Client et Volume)");
      return;
    }
    if (formData.volume < 10) {
      alert("Le volume minimum pour une livraison est de 10 m³.");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    const unitPrice = settings.granitePrices?.[formData.sand_type || ''] || 0;
    const newDelivery: Delivery = {
      id: initialData?.id || '',
      user_id: initialData?.user_id || '',
      delivery_date: formData.delivery_date!,
      sand_type: formData.sand_type!,
      volume: Number(formData.volume),
      unit_price: unitPrice,
      gross_amount: finances.grossAmount,
      management_share: finances.managementShare,
      other_fees: finances.otherFees,
      partner_share: finances.partnerShare,
      agent_commission: finances.agentCommission,
      management_net: finances.managementNet,
      client: formData.client!,
      payment_date: formData.payment_date || null,
      commission_rate: Number(formData.commission_rate),
      commission_amount: finances.agentCommission,
      net_amount: finances.managementNet,
      truck_number: formData.truck_number!,
      notes: formData.notes
    };

    const initialPayment = !initialData && (formData.initial_payment || 0) > 0 ? {
      amount: Number(formData.initial_payment),
      method: formData.payment_method!
    } : undefined;

    onSubmit(newDelivery, initialPayment);
    setShowConfirm(false);
  };

  return (
    <form onSubmit={handlePreliminarySubmit} className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-lexend tracking-tight">Configuration Livraison</h2>
          <p className="text-slate-500 text-xs mt-1">Saisie des détails opérationnels et financiers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Operation Details */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Livraison</label>
              <input
                type="date"
                required
                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium bg-slate-50/50"
                value={formData.delivery_date}
                onChange={e => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Paiement</label>
              <input
                type="date"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium bg-slate-50/50"
                value={formData.payment_date || ''}
                onChange={e => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client / Destination</label>
            <input
              type="text"
              placeholder="Nom du client ou site..."
              required
              className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium"
              value={formData.client}
              onChange={e => setFormData(prev => ({ ...prev, client: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type de Granite</label>
              <select
                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium appearance-none bg-white cursor-pointer"
                value={formData.sand_type}
                onChange={e => setFormData(prev => ({ ...prev, sand_type: e.target.value }))}
              >
                {settings.customSandTypes.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Immatriculation</label>
              <input
                type="text"
                placeholder="Ex: TK-1234"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium uppercase"
                value={formData.truck_number}
                onChange={e => setFormData(prev => ({ ...prev, truck_number: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes Internes</label>
            <textarea
              placeholder="Observation sur la livraison..."
              className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-medium min-h-[100px]"
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Right Column: Financial Calculations */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Volume (M³)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 30"
                className="w-full px-5 py-4 rounded-xl border-none focus:ring-4 focus:ring-slate-500/10 outline-none transition-all font-mono font-bold text-xl bg-slate-900 text-white"
                value={formData.volume || ''}
                onChange={e => setFormData(prev => ({ ...prev, volume: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Commission (%)</label>
              <input
                type="number"
                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all font-bold text-xl"
                value={formData.commission_rate}
                onChange={e => setFormData(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Simplified Finance Recap Card */}
          <div className="premium-card p-6 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Estimation Brut</span>
                  <div className="text-2xl font-bold font-mono">{formatCurrency(finances.grossAmount)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Prix Moyen</span>
                  <div className="text-xs font-semibold text-slate-300">{formatCurrency(settings.granitePrices?.[formData.sand_type || ''] || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Part Direction</span>
                  <div className="text-base font-bold text-white font-mono">{formatCurrency(finances.managementShare)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Com. Agent (Recalculée)</span>
                  <div className="text-base font-bold text-amber-400 font-mono">-{formatCurrency(finances.agentCommission)}</div>
                </div>
              </div>

              <div className="bg-emerald-500/20 rounded-xl p-4 flex justify-between items-center border border-emerald-500/30">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Bénéfice Net LogLogix</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(finances.managementNet)}</span>
              </div>
            </div>
          </div>

          {!initialData && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acompte Client</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none transition-all font-mono font-bold"
                    value={formData.initial_payment || ''}
                    onChange={e => setFormData(prev => ({ ...prev, initial_payment: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold"
                    value={formData.payment_method}
                    onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    {settings.paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solde Attendu</span>
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {formatCurrency(finances.grossAmount - (formData.initial_payment || 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-slate-100 mb-10">
        <button
          type="button"
          onClick={onCancel}
          className="px-10 py-4 font-bold text-xs text-slate-500 hover:text-slate-900 rounded-xl transition-all"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-slate-800 shadow-lg active:scale-95"
        >
          <Save className="w-4 h-4" />
          {initialData ? "Enregistrer" : "Confirmer la Livraison"}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500"
            onClick={() => setShowConfirm(false)}
          ></div>

          <div className="relative bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden animate-modal-in border border-white/60">
            {/* Ticket-like Header */}
            <div className="p-10 border-b border-slate-100/50 bg-slate-50/50 text-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-200 rounded-b-full"></div>
              <div className="inline-flex p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-xl shadow-slate-900/20 mb-4">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-lexend tracking-tight">Vérification des données</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Récapitulatif de livraison</p>
            </div>

            <div className="p-10 space-y-8">
              {/* Receipt Body */}
              <div className="space-y-4 px-2">
                <div className="flex justify-between items-center group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</span>
                  <div className="h-px flex-1 mx-4 bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                  <span className="font-lexend font-black text-slate-900">{formData.client}</span>
                </div>

                <div className="flex justify-between items-center group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matériau</span>
                  <div className="h-px flex-1 mx-4 bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                  <span className="font-lexend font-black text-slate-900">{formData.volume}m³ • {formData.sand_type}</span>
                </div>

                <div className="flex justify-between items-center group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Immatriculation</span>
                  <div className="h-px flex-1 mx-4 bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                  <span className="font-lexend font-black text-slate-900 uppercase">{formData.truck_number || "-"}</span>
                </div>

                {/* Financial Divider */}
                <div className="pt-6 border-t border-slate-100/50 border-dashed">
                  <div className="flex justify-between items-center group mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Brut</span>
                    <div className="h-px flex-1 mx-4 bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                    <span className="font-mono font-black text-slate-900 text-lg">{formatCurrency(finances.grossAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center group mb-4">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Net GranitLogix</span>
                    <div className="h-px flex-1 mx-4 bg-emerald-100/30 group-hover:bg-emerald-100/50 transition-colors"></div>
                    <span className="font-mono font-black text-emerald-600 text-lg">{formatCurrency(finances.managementNet)}</span>
                  </div>
                </div>

                {!initialData && (formData.initial_payment || 0) > 0 && (
                  <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-900/10 mt-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-white/10 transition-colors">
                      <CreditCard className="w-12 h-12" />
                    </div>
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Acompte Immédiat ({formData.payment_method})</p>
                        <p className="text-xl font-black font-mono">{formatCurrency(formData.initial_payment || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reste</p>
                        <p className="text-sm font-bold text-slate-300 font-mono">
                          {formatCurrency(finances.grossAmount - (formData.initial_payment || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100/50 flex gap-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-6 py-5 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
              >
                Rectifier
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-[2] px-6 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] border-t border-white/10"
              >
                Valider Livraison
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default DeliveryForm;
