import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery, Payment, AppSettings } from '../types';
import { X, Plus, Trash2, Calendar, CreditCard, Banknote, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/finance';

interface PaymentModalProps {
    delivery: Delivery;
    settings: AppSettings;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh in parent
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    delivery,
    settings,
    isOpen,
    onClose,
    onUpdate
}) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newPayment, setNewPayment] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        method: settings.paymentMethods[0] || 'Espèces',
        reference: '',
        notes: ''
    });

    const fetchPayments = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('delivery_id', delivery.id)
            .order('payment_date', { ascending: false });

        if (!error && data) {
            setPayments(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen && delivery.id) {
            fetchPayments();
            // Reset form
            setNewPayment({
                amount: '',
                payment_date: new Date().toISOString().split('T')[0],
                method: settings.paymentMethods[0] || 'Espèces',
                reference: '',
                notes: ''
            });
        }
    }, [isOpen, delivery.id]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayment.amount) return;

        const amount = Number(newPayment.amount);

        const { error } = await supabase
            .from('payments')
            .insert([{
                delivery_id: delivery.id,
                amount: amount,
                payment_date: newPayment.payment_date,
                method: newPayment.method,
                reference: newPayment.reference,
                notes: newPayment.notes
            }]);

        if (error) {
            alert('Erreur lors de l\'ajout du paiement');
            console.error(error);
        } else {
            fetchPayments();
            onUpdate(); // Refund parent to update stats
            setNewPayment(prev => ({ ...prev, amount: '', reference: '', notes: '' }));
        }
    };

    const handleDeletePayment = async (id: string) => {
        if (!window.confirm('Supprimer ce paiement ?')) return;

        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erreur lors de la suppression');
        } else {
            fetchPayments();
            onUpdate();
        }
    };

    if (!isOpen) return null;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = delivery.gross_amount - totalPaid;
    const progress = Math.min((totalPaid / delivery.gross_amount) * 100, 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Ultra Smooth Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col premium-glass rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] animate-modal-in overflow-hidden border-t border-white/60">

                {/* Header Section */}
                <div className="shrink-0 flex justify-between items-center p-8 pb-6 border-b border-white/40">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/20">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-lexend">Flux Financiers</h2>
                        </div>
                        <p className="text-slate-500 font-medium text-xs ml-1">
                            Livraison <span className="text-amber-600 font-black">#{delivery.truck_number}</span> — {delivery.client}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/50 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all duration-300 hover:rotate-90 border border-white/50 shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar overscroll-contain">

                    {/* Dynamic Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-sm group hover:bg-white transition-all duration-300">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Total Devis</span>
                            <div className="text-xl font-black text-slate-900 font-lexend tracking-tighter">
                                {formatCurrency(delivery.gross_amount)}
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 backdrop-blur-md p-6 rounded-[2rem] border border-emerald-500/20 shadow-sm group hover:bg-emerald-500/20 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 block">Encaissé</span>
                                <div className="p-1 bg-emerald-500/20 rounded-lg text-emerald-600">
                                    <CheckCircle2 className="w-3 h-3" />
                                </div>
                            </div>
                            <div className="text-xl font-black text-emerald-700 font-lexend tracking-tighter">
                                {formatCurrency(totalPaid)}
                            </div>
                        </div>

                        <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${remaining > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-50/50 border-white/60'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] block ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    Solde Client
                                </span>
                                {remaining > 0 && (
                                    <div className="p-1 bg-amber-500/20 rounded-lg text-amber-600 animate-pulse">
                                        <AlertCircle className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                            <div className={`text-xl font-black font-lexend tracking-tighter ${remaining > 0 ? 'text-amber-700' : 'text-slate-300 line-through'}`}>
                                {formatCurrency(Math.max(0, remaining))}
                            </div>
                        </div>
                    </div>

                    {/* Progression Visual */}
                    <div className="space-y-4 px-2">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recouvrement actuel</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-slate-900 font-lexend tracking-tighter">{Math.round(progress)}%</span>
                                    {progress >= 100 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-md text-[8px] font-black uppercase">Solder</span>}
                                </div>
                            </div>
                        </div>
                        <div className="relative h-4 bg-white/40 rounded-full border border-white/60 p-1 overflow-hidden shadow-inner">
                            <div
                                className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                                style={{ width: `calc(${progress}% - 8px)` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* New Payment Interface */}
                    {remaining > 0 && (
                        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500"></div>

                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2 relative z-10">
                                <div className="p-2 bg-slate-900 text-white rounded-xl shadow-md">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                                Effectuer un versement
                            </h3>

                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                                <div className="md:col-span-4 space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            required
                                            value={newPayment.payment_date}
                                            onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 text-sm bg-white/80 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-4 space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant</label>
                                    <div className="relative">
                                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            max={remaining}
                                            value={newPayment.amount}
                                            onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 text-sm bg-white/80 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-slate-900 shadow-sm text-lg"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-4 space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Méthode</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={newPayment.method}
                                            onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                                            className="w-full pl-11 pr-10 py-4 text-sm bg-white/80 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none appearance-none transition-all font-bold text-slate-700 shadow-sm cursor-pointer"
                                        >
                                            {settings.paymentMethods.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronRight className="w-4 h-4 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-12 pt-2">
                                    <button
                                        type="submit"
                                        disabled={!newPayment.amount || Number(newPayment.amount) <= 0}
                                        className="w-full bg-slate-900 hover:bg-black text-white text-xs font-black py-5 px-8 rounded-[1.5rem] transition-all duration-300 disabled:opacity-20 disabled:grayscale transform active:scale-[0.98] shadow-xl shadow-slate-900/10 font-lexend uppercase tracking-[0.2em] border-t border-white/10"
                                    >
                                        Valider le paiement
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Enhanced History Section */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Historique des transactions</h3>
                            <div className="px-4 py-1.5 bg-white/60 border border-white/60 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-tighter shadow-sm backdrop-blur-sm">
                                {payments.length} Mouvement{payments.length > 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="bg-white/30 backdrop-blur-sm rounded-[2.5rem] border border-white/40 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-900/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-white/40">
                                    <tr>
                                        <th className="px-8 py-5">Date opération</th>
                                        <th className="px-8 py-5">Mode</th>
                                        <th className="px-8 py-5 text-right">Montant</th>
                                        <th className="px-8 py-5 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/20">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 animate-pulse">
                                                    <div className="w-16 h-16 bg-white/40 rounded-[2rem] flex items-center justify-center text-slate-200 border border-white/60">
                                                        <CreditCard className="w-8 h-8" />
                                                    </div>
                                                    <p className="font-lexend font-bold text-slate-400 tracking-tight">Aucun mouvement détecté</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-white/40 transition-all duration-300 group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                        <span className="font-bold text-slate-700 tracking-tight">
                                                            {new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-white/80 border border-slate-100 text-[10px] font-black text-slate-600 shadow-sm uppercase tracking-wider">
                                                        {payment.method}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="font-black text-slate-900 font-lexend text-base tracking-tighter">
                                                        {formatCurrency(payment.amount)}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-sm hover:shadow-red-200/50 transform hover:scale-110"
                                                        title="Supprimer la transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
