
import React, { useState, useEffect } from 'react';
import { Delivery, AppSettings } from '../types';
import { calculateCommission, calculateNet, formatCurrency } from '../utils/finance';
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
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    const comm = calculateCommission(formData.gross_amount || 0, formData.commission_rate || 0);
    const net = calculateNet(formData.gross_amount || 0, comm);
    setCommissionAmount(comm);
    setNetAmount(net);
  }, [formData.gross_amount, formData.commission_rate]);

  const handlePreliminarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.gross_amount) {
      alert("Veuillez remplir les champs obligatoires (Client et Montant Brut)");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    const newDelivery: Delivery = {
      id: initialData?.id || '',
      delivery_date: formData.delivery_date!,
      sand_type: formData.sand_type!,
      client: formData.client!,
      payment_date: formData.payment_date || null,
      gross_amount: Number(formData.gross_amount),
      commission_rate: Number(formData.commission_rate),
      commission_amount: commissionAmount,
      net_amount: netAmount,
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
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">💰 Montant Brut</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none font-mono"
              value={formData.gross_amount || ''}
              onChange={e => setFormData(prev => ({ ...prev, gross_amount: Number(e.target.value) }))}
            />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900 rounded-2xl md:col-span-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Montant Brut</span>
            <div className="text-white font-mono font-bold text-lg leading-none">
              {formatCurrency(formData.gross_amount || 0)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commission ({formData.commission_rate}%)</span>
            <div className="text-amber-400 font-mono font-bold text-lg leading-none">
              {formatCurrency(commissionAmount)}
            </div>
          </div>
          <div className="space-y-1 border-l border-slate-800 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Net</span>
            <div className={`font-mono font-bold text-lg leading-none ${netAmount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(netAmount)}
            </div>
          </div>
          {!initialData && (
            <div className="space-y-1 border-l border-slate-800 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avance</span>
              <div className="text-emerald-400 font-mono font-bold text-lg leading-none">
                {formatCurrency(formData.initial_payment || 0)}
              </div>
            </div>
          )}
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
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Reste à Payer</span>
                <p className="text-xs text-emerald-400/60 leading-tight">Basé sur le montant brut</p>
              </div>
              <div className="text-emerald-400 font-black text-2xl tracking-tight font-mono">
                {formatCurrency((formData.gross_amount || 0) - (formData.initial_payment || 0))}
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

                <div className="text-slate-500">Montant Brut:</div>
                <div className="font-mono font-bold text-right text-lg">{formatCurrency(formData.gross_amount || 0)}</div>

                <div className="text-slate-500">Commission ({formData.commission_rate}%):</div>
                <div className="font-mono text-right text-amber-600">-{formatCurrency(commissionAmount)}</div>

                <div className="text-slate-500 pt-1 font-bold">Total Net (Gain):</div>
                <div className="font-mono font-bold text-right text-emerald-600 text-lg">{formatCurrency(netAmount)}</div>

                {!initialData && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 pt-4"></div>
                    <div className="text-slate-500">Avance (Acompte):</div>
                    <div className="font-mono font-bold text-right text-blue-600">{formatCurrency(formData.initial_payment || 0)}</div>

                    <div className="col-span-2 bg-emerald-50 p-4 rounded-2xl mt-2 flex justify-between items-center">
                      <span className="font-black text-emerald-800 uppercase text-xs">Reste à Payer</span>
                      <span className="font-mono font-black text-emerald-700 text-xl">
                        {formatCurrency((formData.gross_amount || 0) - (formData.initial_payment || 0))}
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
