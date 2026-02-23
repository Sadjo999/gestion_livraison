import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, AlertCircle, CheckCircle2, User as UserIcon, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Profile } from '../types';

interface ProfileSettingsProps {
    profile: Profile;
    onUpdate: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onUpdate }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }
        if (newPassword.length < 6) {
            setError('Le mot de passe doit faire au moins 6 caractères');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setSuccessMsg('Mot de passe mis à jour avec succès !');
            setNewPassword('');
            setConfirmPassword('');
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            onUpdate();
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la mise à jour');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="premium-card p-6 md:p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 font-lexend tracking-tight">Informations Personnelles</h3>
                        <p className="text-slate-500 text-sm">Détails de votre compte utilisateur.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-bold">
                            {profile.first_name} {profile.last_name}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email / Identifiant</label>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-bold flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {profile.email}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle Système</label>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-bold flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            <span className="capitalize">{profile.role === 'admin' ? 'Direction / Administrateur' : 'Agent de Gestion'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="premium-card p-6 md:p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-slate-800" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 font-lexend tracking-tight">Changer le Mot de Passe</h3>
                        <p className="text-slate-500 text-sm">Sécurisez votre accès en mettant à jour votre mot de passe.</p>
                    </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="max-w-md space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau Mot de Passe</label>
                        <div className="relative group">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold placeholder:text-slate-300 pr-12"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 outline-none"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le Mot de Passe</label>
                        <div className="relative group">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold placeholder:text-slate-300 pr-12"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 outline-none"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 text-emerald-600 text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <p className="font-medium">{successMsg}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 font-lexend uppercase tracking-widest text-xs"
                    >
                        {isLoading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
