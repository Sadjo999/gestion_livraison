import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { UserPlus, Users, Phone, Mail, Shield, ShieldCheck, Trash2, AlertCircle, CheckCircle2, ChevronRight, Search } from 'lucide-react';

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
        if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.')) return;

        setIsLoading(true);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('smooth-worker', {
                body: { action: 'delete', userId: id }
            });

            if (invokeError) throw new Error(data?.error || invokeError.message);

            setProfiles(prev => prev.filter(p => p.id !== id));
            setMsg({ type: 'success', text: 'Utilisateur et ses accès supprimés avec succès.' });
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
                <div className={`p-4 rounded-2xl flex gap-4 border premium-glass animate-slide-up ${msg.type === 'success' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' : 'bg-red-50/50 border-red-200 text-red-700'
                    }`}>
                    {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <p className="text-sm font-bold">{msg.text}</p>
                </div>
            )}

            {isCreating && (
                <div className="premium-card p-0 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xl font-black text-slate-900 font-lexend tracking-tight">Configuration Nouvel Utilisateur</h2>
                    </div>
                    <form onSubmit={handleCreateUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de Famille</label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Professionnel</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro de Téléphone</label>
                            <input
                                type="tel"
                                required
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle Système</label>
                            <select
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold appearance-none bg-white cursor-pointer"
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                            >
                                <option value="user">Agent de Gestion</option>
                                <option value="admin">Administrateur / Direction</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 rounded-2xl transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-10 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95"
                            >
                                {isLoading ? 'Traitement en cours...' : 'Générer le Compte'}
                            </button>
                        </div>
                    </form>
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
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
        </div>
    );
};

export default UserManagement;

