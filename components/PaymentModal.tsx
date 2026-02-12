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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Gestion des Paiements</h2>
                        <p className="text-sm text-slate-500">
                            Livraison #{delivery.truck_number} - {delivery.client}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <span className="text-sm text-slate-500 block mb-1">Total à Payer</span>
                            <span className="text-lg font-bold text-slate-800">{formatCurrency(delivery.gross_amount)}</span>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <span className="text-sm text-emerald-600 block mb-1">Total Payé</span>
                            <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div className={`p-4 rounded-lg border ${remaining > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-sm block mb-1 ${remaining > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Reste à Payer</span>
                            <span className={`text-lg font-bold ${remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                {formatCurrency(Math.max(0, remaining))}
                            </span>
                        </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Add Payment Form */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Ajouter un règlement
                        </h3>
                        <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        required
                                        value={newPayment.payment_date}
                                        onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Montant</label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        required
                                        placeholder="0"
                                        max={remaining > 0 ? remaining : undefined} // Optional constraint
                                        value={newPayment.amount}
                                        onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Mode</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        value={newPayment.method}
                                        onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                                    >
                                        {settings.paymentMethods.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <button
                                    type="submit"
                                    disabled={!newPayment.amount || Number(newPayment.amount) <= 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Payments List */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Historique ({payments.length})</h3>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Mode</th>
                                        <th className="px-4 py-3 text-right">Montant</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                Aucun paiement enregistré pour le moment.
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-700">
                                                    {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600">
                                                        {payment.method}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
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
