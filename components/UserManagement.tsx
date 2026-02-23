import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { UserPlus, Users, Phone, Mail, Shield, ShieldCheck, Trash2, AlertCircle, CheckCircle2, ChevronRight, Search, X } from 'lucide-react';

const UserManagement: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // New User Form State
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletableUser, setDeletableUser] = useState<Profile | null>(null);

    const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') {
                fetchProfiles();
            }
        };
        checkRole();
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setMsg({ type: 'error', text: 'Impossible de charger la liste des agents. Vérifiez votre connexion.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        setIsLoading(true);

        const defaultPassword = Math.random().toString(36).slice(-4) + 'A1!';

        try {
            // Note: Calling signUp from an authenticated session might have limitations 
            // depending on Supabase Auth settings. Optimally this should be an Edge Function.
            // For this implementation, we use signUp which sends an email if configured.
            if (!defaultPassword) throw new Error('Password generation failed');

            // Call the Admin Edge Function to create the user and send the email
            const { data, error: invokeError } = await supabase.functions.invoke('smooth-worker', {
                body: {
                    email,
                    firstName,
                    lastName,
                    phone,
                    role,
                    password: defaultPassword
                }
            });

            if (invokeError) {
                console.error("Invoke Error Details:", invokeError);
                console.error("Response Data:", data);

                // Extract error message from body if available
                const errorMsg = data?.error || invokeError.message || "Erreur de communication avec le serveur";
                const suggestion = data?.suggestion ? `\n\nNote: ${data.suggestion}` : '';
                throw new Error(`${errorMsg}${suggestion}`);
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            if (data?.warning) {
                setMsg({
                    type: 'success', // It's still a success since account is created
                    text: `⚠️ ${data.warning}\n\n${data.details}\n\nMOT DE PASSE GÉNÉRÉ : ${data.manualPassword}\n\nVeuillez transmettre ce mot de passe manuellement à l'agent.`
                });
            } else {
                setMsg({
                    type: 'success',
                    text: `Utilisateur créé ! Un email personnalisé contenant le mot de passe (${defaultPassword}) a été envoyé à ${email}.`
                });
            }

            // Reset form
            setEmail('');
            setFirstName('');
            setLastName('');
            setPhone('');
            setRole('user');
            setIsCreating(false);
            fetchProfiles();
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: 'active' | 'suspended') => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setProfiles(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
            setMsg({ type: 'success', text: `Statut mis à jour : ${newStatus === 'active' ? 'Activé' : 'Suspendu'}` });
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        }
    };

    const deleteProfile = async (id: string) => {
        const user = profiles.find(p => p.id === id);
        if (user) {
            setDeletableUser(user);
            setIsDeleting(true);
        }
    };

    const confirmDelete = async () => {
        if (!deletableUser) return;
        const id = deletableUser.id;

        setIsLoading(true);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('smooth-worker', {
                body: { action: 'delete', userId: id }
            });

            if (invokeError) throw new Error(data?.error || invokeError.message);

            setProfiles(prev => prev.filter(p => p.id !== id));
            setMsg({ type: 'success', text: 'Utilisateur et ses accès supprimés avec succès.' });
            setIsDeleting(false); // Close only on success
            setDeletableUser(null);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 font-lexend tracking-tight">Gestion de l'Équipe</h1>
                    <p className="text-slate-500 text-sm mt-1">Gérez les accès et les rôles de vos gérants.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm ${isCreating
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                        }`}
                >
                    {isCreating ? 'Annuler' : <><UserPlus className="w-4 h-4" /> Nouvel Agent</>}
                </button>
            </div>

            {msg && (
                <div className={`p-6 rounded-2xl flex flex-col md:flex-row gap-4 border premium-glass animate-slide-up shadow-lg ${msg.type === 'success'
                    ? (msg.text.includes('⚠️') ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-200 text-emerald-700')
                    : 'bg-red-50/50 border-red-200 text-red-700'
                    }`}>
                    <div className="flex-shrink-0">
                        {msg.text.includes('⚠️')
                            ? <AlertCircle className="w-8 h-8 text-amber-500" />
                            : msg.type === 'success'
                                ? <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                : <AlertCircle className="w-8 h-8 text-red-500" />
                        }
                    </div>
                    <div className="flex-1 space-y-3">
                        <p className="text-sm font-black uppercase tracking-tight leading-snug whitespace-pre-line">
                            {msg.text.split('MOT DE PASSE GÉNÉRÉ :')[0]}
                        </p>

                        {msg.text.includes('MOT DE PASSE GÉNÉRÉ :') && (
                            <div className="bg-white/80 p-4 rounded-xl border border-amber-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Mot de Passe à transmettre</span>
                                    <code className="text-2xl font-black font-mono text-slate-900 tracking-tighter">
                                        {msg.text.split('MOT DE PASSE GÉNÉRÉ :')[1]?.split('Veuillez')[0]?.trim()}
                                    </code>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">
                                    Transmettez ce code via WhatsApp ou SMS
                                </div>
                            </div>
                        )}

                        {msg.text.includes('Veuillez transmettre') && (
                            <p className="text-xs font-medium text-amber-700/70 border-t border-amber-200/30 pt-2">
                                {msg.text.split('Veuillez transmettre')[1] ? 'Veuillez transmettre' + msg.text.split('Veuillez transmettre')[1] : ''}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500"
                        onClick={() => setIsCreating(false)}
                    ></div>

                    {/* Modal Container */}
                    <div className="relative w-full max-w-2xl premium-glass rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] animate-modal-in overflow-hidden border-t border-white/60">
                        {/* Header */}
                        <div className="p-8 border-b border-white/40 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/20">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 font-lexend tracking-tight">Nouvel Agent</h2>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configuration des accès</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="p-3 bg-white/50 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all duration-300 hover:rotate-90 border border-white/50 shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleCreateUser}>
                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                                    <div className="relative">
                                        <ChevronRight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-11 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-white/50"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Prénom"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de Famille</label>
                                    <div className="relative">
                                        <ChevronRight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-11 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-white/50"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Nom"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Professionnel</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="email"
                                            required
                                            className="w-full pl-11 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-white/50"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="agent@granitlogix.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="tel"
                                            required
                                            className="w-full pl-11 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-white/50"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="6XX XX XX XX"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Niveau d'Accès</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <select
                                            className="w-full pl-11 pr-10 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-slate-700 bg-white/50 appearance-none cursor-pointer"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                                        >
                                            <option value="user">Agent (Standard)</option>
                                            <option value="admin">Administrateur</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 bg-slate-50/50 border-t border-white/40 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-[0.98]"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] border-t border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Opération en cours...' : 'Générer l\'accès'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleting && deletableUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => { setIsDeleting(false); setDeletableUser(null); }}
                    ></div>
                    <div className="relative w-full max-w-md premium-glass rounded-[2rem] shadow-2xl animate-modal-in overflow-hidden border border-white/40">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-sm border border-red-100">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 font-lexend tracking-tight mb-2">Supprimer l'accès ?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed px-4">
                                Vous êtes sur le point de révoquer définitivement les accès de <span className="font-bold text-slate-900">{deletableUser.first_name} {deletableUser.last_name}</span>.
                            </p>
                            <div className="mt-4 p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">Action Irréversible</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50 border-t border-white/40 flex gap-3">
                            <button
                                onClick={() => { setIsDeleting(false); setDeletableUser(null); }}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Suppression...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="premium-card p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher par nom, email ou rôle..."
                        className="bg-transparent border-none outline-none text-sm w-full font-bold text-slate-700 placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membre</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permissions</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">État</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Initialisation...</td>
                                </tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold">Aucun profil ne correspond à votre recherche.</td>
                                </tr>
                            ) : (
                                filteredProfiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                                                    {p.first_name[0]}{p.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{p.first_name} {p.last_name}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Rejoint le {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {p.email}
                                                </div>
                                                <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            {p.role === 'admin' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-100">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                                                    Gérant
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-2">
                                                {p.status === 'suspended' ? (
                                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                                ) : p.is_password_reset_required ? (
                                                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                )}
                                                <span className="text-[10px] font-bold text-slate-600">
                                                    {p.status === 'suspended' ? 'Suspendu' : p.is_password_reset_required ? 'Attente Reset' : 'Actif'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity duration-300">
                                                <button
                                                    onClick={() => toggleStatus(p.id, p.status)}
                                                    className={`p-3 rounded-xl shadow-sm transition-all active:scale-90 ${p.status === 'active' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                    title={p.status === 'active' ? 'Suspendre' : 'Activer'}
                                                >
                                                    {p.status === 'active' ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => deleteProfile(p.id)}
                                                    className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl shadow-sm transition-all active:scale-90"
                                                    title="Supprimer Définitivement"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default UserManagement;

