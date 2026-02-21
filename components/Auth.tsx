import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, KeyRound, Mail, Phone, User as UserIcon, Lock, AlertCircle, CheckCircle2, Truck, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
    onSession: (session: any) => void;
    initialResetRequired?: boolean;
}

const Auth: React.FC<AuthProps> = ({ onSession, initialResetRequired = false }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetRequired, setResetRequired] = useState(initialResetRequired);
    const [isResetting, setIsResetting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (loginError) throw loginError;

            // Check if password reset is required from profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_password_reset_required')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.warn('Erreur lors de la récupération du profil :', profileError);
                onSession(data.session);
                return;
            }

            if (profile?.is_password_reset_required) {
                setResetRequired(true);
            } else {
                onSession(data.session);
            }
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // Update profile to mark reset as completed
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_password_reset_required: false })
                .eq('id', (await supabase.auth.getUser()).data.user?.id);

            if (profileError) throw profileError;

            const { data: sessionData } = await supabase.auth.getSession();
            onSession(sessionData.session);
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la mise à jour du mot de passe');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // First find the user by email (using profiles table since we can't search auth.users easily from client)
            const { data: profile, error: findError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (findError || !profile) {
                throw new Error('Aucun compte trouvé avec cet email.');
            }

            // Mark as reset required
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ is_password_reset_required: true })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setSuccessMsg('Demande prise en compte. Un mot de passe temporaire a été généré et envoyé à la direction pour vous.');
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la réinitialisation');
        } finally {
            setIsLoading(false);
        }
    };

    if (resetRequired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter">
                <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white/40 animate-slide-up">
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-400 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-amber-200 rotate-3">
                            <KeyRound className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight font-lexend">Sécurité & Profil</h2>
                        <p className="text-slate-500 font-medium mt-3 text-sm">Pour votre première connexion, veuillez définir un nouveau mot de passe sécurisé.</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white/50 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white/50 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm animate-shake">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 font-lexend uppercase tracking-widest text-sm"
                        >
                            {isLoading ? 'Mise à jour...' : 'Finaliser mon profil'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden font-inter">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl shadow-sm mb-6">
                        <Truck className="w-8 h-8 text-slate-800" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight font-lexend leading-none">GranitLogix</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-3">Gestion de Livraison de Granit</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                    <div className="p-8 md:p-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1 font-lexend tracking-tight">
                            {isResetting ? 'Récupération' : 'Connexion'}
                        </h2>
                        <p className="text-slate-500 font-medium mb-8 text-sm">
                            {isResetting
                                ? 'Réinitialisez votre accès.'
                                : 'Accédez à votre espace gérant.'}
                        </p>

                        <form onSubmit={isResetting ? handleForgotPassword : handleLogin} className="space-y-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identifiant Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-4.5 bg-slate-50/50 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium placeholder:text-slate-300"
                                        placeholder="votre@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {!isResetting && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsResetting(true)}
                                            className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest"
                                        >
                                            Oublié ?
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="w-full pl-12 pr-12 py-4.5 bg-slate-50/50 rounded-2xl border border-slate-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium placeholder:text-slate-300"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm animate-shake">
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
                                className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-slate-200 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 font-lexend uppercase tracking-[0.2em] text-sm group"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        <span>{isResetting ? 'Réinitialiser' : 'Se Connecter'}</span>
                                    </>
                                )}
                            </button>

                            {isResetting && (
                                <button
                                    type="button"
                                    onClick={() => setIsResetting(false)}
                                    className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
                                >
                                    Annuler et revenir
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-[11px] font-medium">
                            Besoin d'un compte ? <span className="text-slate-900 font-bold">Contactez la direction</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;

const LayoutDashboard = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2Z" /><path d="M22 6a2 2 0 0 0-2-2h-4v16h4a2 2 0 0 0 2-2V6Z" />
    </svg>
);
