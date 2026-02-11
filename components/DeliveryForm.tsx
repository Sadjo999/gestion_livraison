
import React, { useState, useEffect } from 'react';
import { Delivery, AppSettings } from '../types';
import { calculateCommission, calculateNet, formatCurrency, calculateGraniteFinances } from '../utils/finance';
import { Save, X } from 'lucide-react';

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
    managementNet: 0
  });

  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    const unitPrice = settings.granitePrices?.[formData.sand_type || ''] || 0;
    const results = calculateGraniteFinances(formData.volume || 0, unitPrice, formData.commission_rate || 35);
    setFinances(results);
    setNetAmount(results.managementNet);
  }, [formData.volume, formData.sand_type, formData.commission_rate, settings.granitePrices]);

  const handlePreliminarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.gross_amount) {
      alert("Veuillez remplir les champs obligatoires (Client et Montant Brut)");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    const unitPrice = settings.granitePrices?.[formData.sand_type || ''] || 0;
    const newDelivery: Delivery = {
      id: initialData?.id || '',
      delivery_date: formData.delivery_date!,
      sand_type: formData.sand_type!,
      volume: Number(formData.volume),
      unit_price: unitPrice,
      gross_amount: finances.grossAmount,
      management_share: finances.managementShare,
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
    <form onSubmit={handlePreliminarySubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Dates */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">📅 Date de Livraison</label>
          <input
            type="date"
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.delivery_date}
            onChange={e => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">📆 Date de Paiement</label>
          <input
            type="date"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.payment_date || ''}
            onChange={e => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
          />
        </div>

        {/* Basic Info */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏗️ Type de Sable</label>
          <select
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.sand_type}
            onChange={e => setFormData(prev => ({ ...prev, sand_type: e.target.value }))}
          >
            {settings.customSandTypes.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">👤 Client / Destination</label>
          <input
            type="text"
            placeholder="Entrez le nom..."
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.client}
            onChange={e => setFormData(prev => ({ ...prev, client: e.target.value }))}
          />
        </div>

        {/* Financials */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">📦 Volume (m³)</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="Ex: 30"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono"
            value={formData.volume || ''}
            onChange={e => setFormData(prev => ({ ...prev, volume: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏷️ Prix Unitaire (/m³)</label>
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono">
            {formatCurrency(settings.granitePrices?.[formData.sand_type || ''] || 0)}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">📊 Commission (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono"
            value={formData.commission_rate}
            onChange={e => setFormData(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-900 rounded-2xl md:col-span-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Montant Brut</span>
            <div className="text-white font-mono font-bold text-lg leading-none">
              {formatCurrency(finances.grossAmount)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part Partenaire</span>
            <div className="text-slate-300 font-mono font-bold text-lg leading-none">
              {formatCurrency(finances.partnerShare)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part Direction (3m³)</span>
            <div className="text-blue-400 font-mono font-bold text-lg leading-none">
              {formatCurrency(finances.managementShare)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comm Agent ({formData.commission_rate}%)</span>
            <div className="text-amber-400 font-mono font-bold text-lg leading-none">
              {formatCurrency(finances.agentCommission)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Direction (65%)</span>
            <div className={`font-mono font-bold text-lg leading-none ${finances.managementNet < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(finances.managementNet)}
            </div>
          </div>
        </div>

        {!initialData && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">💵 Avance (Acompte)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-mono"
                value={formData.initial_payment || ''}
                onChange={e => setFormData(prev => ({ ...prev, initial_payment: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">💳 Mode de Paiement</label>
              <select
                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                value={formData.payment_method}
                onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              >
                {settings.paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 p-4 bg-emerald-950 border border-emerald-900 rounded-2xl flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Reste à Payer (Client)</span>
                <p className="text-xs text-emerald-400/60 leading-tight">Basé sur le montant brut total</p>
              </div>
              <div className="text-emerald-400 font-black text-2xl tracking-tight font-mono">
                {formatCurrency((finances.grossAmount || 0) - (formData.initial_payment || 0))}
              </div>
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">🚚 Truck / Camion</label>
          <input
            type="text"
            placeholder="Plaque..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.truck_number}
            onChange={e => setFormData(prev => ({ ...prev, truck_number: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">📝 Notes</label>
          <input
            type="text"
            placeholder="Infos utiles..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
            value={formData.notes || ''}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100">
        <button
          type="submit"
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-amber-200"
        >
          <Save className="w-5 h-5" />
          {initialData ? "Mettre à jour" : "Confirmer l'Enregistrement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
        >
          Annuler
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Vérification de la Livraison</h3>
              <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="text-slate-500">Date:</div>
                <div className="font-bold text-right">{formData.delivery_date}</div>

                <div className="text-slate-500">Client:</div>
                <div className="font-bold text-right">{formData.client}</div>

                <div className="text-slate-500">Camion:</div>
                <div className="font-bold text-right text-amber-600">{formData.truck_number}</div>

                <div className="col-span-2 border-t border-slate-100 pt-4"></div>

                <div className="text-slate-500">Volume:</div>
                <div className="font-bold text-right">{formData.volume} m³</div>

                <div className="text-slate-500">Montant Brut Total:</div>
                <div className="font-mono font-bold text-right text-lg">{formatCurrency(finances.grossAmount)}</div>

                <div className="col-span-2 border-t border-slate-100 pt-2"></div>

                <div className="text-slate-500">Part Partenaire (Reste):</div>
                <div className="font-mono text-right text-slate-600">{formatCurrency(finances.partnerShare)}</div>

                <div className="text-slate-500">Part Direction (Val. 3m³):</div>
                <div className="font-mono text-right text-blue-600 font-bold">{formatCurrency(finances.managementShare)}</div>

                <div className="text-slate-500 pl-4">- Comm Agent ({formData.commission_rate}%):</div>
                <div className="font-mono text-right text-amber-600">-{formatCurrency(finances.agentCommission)}</div>

                <div className="text-slate-500 pl-4 font-bold">- Net Direction (65%):</div>
                <div className="font-mono font-bold text-right text-emerald-600">{formatCurrency(finances.managementNet)}</div>

                {!initialData && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 pt-4"></div>
                    <div className="text-slate-500">Avance client:</div>
                    <div className="font-mono font-bold text-right text-blue-600">{formatCurrency(formData.initial_payment || 0)}</div>

                    <div className="col-span-2 bg-emerald-50 p-4 rounded-2xl mt-2 flex justify-between items-center">
                      <span className="font-black text-emerald-800 uppercase text-xs">Reste à Payer Client</span>
                      <span className="font-mono font-black text-emerald-700 text-xl">
                        {formatCurrency(finances.grossAmount - (formData.initial_payment || 0))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Confirmer et Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default DeliveryForm;
