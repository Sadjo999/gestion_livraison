import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Delivery, Payment, AppSettings } from '../types';
import { X, Plus, Trash2, Calendar, CreditCard, Banknote } from 'lucide-react';
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-500 animate-in fade-in">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/40 overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-slate-100/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight font-lexend">Paiements & Règlements</h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            Livraison <span className="text-amber-600 font-bold">#{delivery.truck_number}</span> — {delivery.client}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 transition-all duration-300 hover:rotate-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

                    {/* Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="premium-glass p-5 rounded-3xl border border-slate-200/50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Total Facturé</span>
                            <span className="text-xl font-black text-slate-900 font-lexend">{formatCurrency(delivery.gross_amount)}</span>
                        </div>
                        <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100/50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-2">Total Encaissé</span>
                            <span className="text-xl font-black text-emerald-700 font-lexend">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div className={`p-5 rounded-3xl border ${remaining > 0 ? 'bg-amber-50/50 border-amber-100/50' : 'bg-slate-50/50 border-slate-100/50'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${remaining > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Reste à Perception</span>
                            <span className={`text-xl font-black font-lexend ${remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                {formatCurrency(Math.max(0, remaining))}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progression du paiement</span>
                            <span className="text-sm font-black text-slate-900 font-lexend">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-1000 ease-out shadow-sm"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Add Payment Form */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-[2rem] p-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                <Plus className="w-3.5 h-3.5" />
                            </div>
                            Nouveau Règlement
                        </h3>
                        <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date d'opération</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="date"
                                        required
                                        value={newPayment.payment_date}
                                        onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 text-sm bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Montant versé</label>
                                <div className="relative group">
                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="number"
                                        required
                                        placeholder="0.00"
                                        max={remaining > 0 ? remaining : undefined}
                                        value={newPayment.amount}
                                        onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 text-sm bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mode</label>
                                <div className="relative group">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                    <select
                                        value={newPayment.method}
                                        onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                                        className="w-full pl-11 pr-10 py-3.5 text-sm bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none appearance-none transition-all font-medium"
                                    >
                                        {settings.paymentMethods.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-12">
                                <button
                                    type="submit"
                                    disabled={!newPayment.amount || Number(newPayment.amount) <= 0}
                                    className="w-full bg-slate-900 hover:bg-black text-white text-sm font-black py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-30 disabled:grayscale transform active:scale-95 shadow-lg shadow-slate-200 font-lexend uppercase tracking-widest"
                                >
                                    Valider l'encaissement
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Payments List */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Historique des flux</h3>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                {payments.length} Transaction{payments.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="premium-card overflow-hidden border border-slate-100">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Méthode</th>
                                        <th className="px-6 py-4 text-right">Montant</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                                        <CreditCard className="w-6 h-6" />
                                                    </div>
                                                    <p className="font-medium italic text-sm">Aucune transaction enregistrée</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <span className="font-bold text-slate-700">
                                                        {new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm leading-none">
                                                        {payment.method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-slate-900 font-lexend text-base">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                                                        title="Supprimer"
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
