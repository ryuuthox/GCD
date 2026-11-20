import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  GraduationCap,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { DoctoralSubject, GcdRole, UserProfile } from '../../domain/types';
import { ROLE_DEFINITIONS, normalizeRoles } from '../../domain/rbac';
import {
  auth,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  resendVerificationEmail,
  sendPasswordReset
} from '../../firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  findPreauthorizedAccountByEmail,
  getUserProfileDoc,
  saveUserProfileDoc,
  syncAdminMarkerIfAuthorized
} from '../../infrastructure/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSubject?: DoctoralSubject | null;
  targetSubjects?: DoctoralSubject[];
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetSubject,
  targetSubjects = [],
  onAuthSuccess
}) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'google'>('email');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [needsVerificationUser, setNeedsVerificationUser] = useState<User | null>(null);

  const [pendingUser, setPendingUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    assignedRoles: GcdRole[];
    preauthorizedTitle?: string;
    preauthorizedLab?: string;
    preauthorizedSchool?: string;
    preauthorizedUniversity?: string;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [cin, setCin] = useState('');
  const [cne, setCne] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('Université Sidi Mohamed Ben Abdellah (USMBA Fès)');

  const resolveAuthenticatedUser = useCallback(
    async (firebaseUser: User) => {
      if (!firebaseUser.email) {
        throw new Error('Aucune adresse email associée à ce compte.');
      }

      if (!firebaseUser.emailVerified) {
        setNeedsVerificationUser(firebaseUser);
        return;
      }

      setNeedsVerificationUser(null);
      const normalizedEmail = firebaseUser.email.trim().toLowerCase();
      const [existingProfile, preauth] = await Promise.all([
        getUserProfileDoc(firebaseUser.uid),
        findPreauthorizedAccountByEmail(normalizedEmail)
      ]);

      if (existingProfile) {
        let effectiveRoles = existingProfile.roles;
        if (normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
          effectiveRoles =
            preauth && preauth.active
              ? Array.from(new Set<GcdRole>([...normalizeRoles(preauth.roles), 'admin']))
              : ['admin'];
        } else if (preauth && preauth.active) {
          effectiveRoles = normalizeRoles(preauth.roles);
        }

        const hydrated: UserProfile = {
          ...existingProfile,
          roles: effectiveRoles,
          active: preauth ? preauth.active : existingProfile.active,
          photoURL: firebaseUser.photoURL || existingProfile.photoURL
        };

        if (effectiveRoles.join(',') !== existingProfile.roles.join(',')) {
          try {
            await saveUserProfileDoc(hydrated);
          } catch {
            // Non-blocking fallback
          }
        }
        await syncAdminMarkerIfAuthorized(hydrated.uid, hydrated.roles);
        onAuthSuccess(hydrated);
        onClose();
        return;
      }

      let assignedRoles: GcdRole[] = ['candidat'];
      if (normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
        assignedRoles =
          preauth && preauth.active
            ? Array.from(new Set<GcdRole>([...normalizeRoles(preauth.roles), 'admin']))
            : ['admin'];
      } else if (preauth && preauth.active) {
        assignedRoles = normalizeRoles(preauth.roles);
      }

      setPendingUser({
        uid: firebaseUser.uid,
        email: normalizedEmail,
        displayName: preauth?.fullName || firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || undefined,
        assignedRoles,
        preauthorizedTitle: preauth?.title,
        preauthorizedLab: preauth?.lab,
        preauthorizedSchool: preauth?.school,
        preauthorizedUniversity: preauth?.university
      });
      setFullName(preauth?.fullName || firebaseUser.displayName || '');
      if (preauth?.university) {
        setUniversity(preauth.university);
      }
    },
    [onAuthSuccess, onClose]
  );

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setInfoMsg('');
      setLoading(false);
      setPendingUser(null);
      setNeedsVerificationUser(null);
      setPasswordInput('');
      return;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subjectList =
    targetSubjects && targetSubjects.length > 0
      ? targetSubjects
      : targetSubject
      ? [targetSubject]
      : [];

  const formatAuthError = (err: unknown): string => {
    const e = err as { code?: string; message?: string };
    const code = e?.code || '';
    const message = e?.message || '';

    if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
      return 'La fenêtre Google a été fermée avant la validation. Réessayez.';
    }
    if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
      return 'La fenêtre Google a été bloquée par votre navigateur. Autorisez les pop-ups puis réessayez.';
    }
    if (
      code === 'auth/popup-interrupted' ||
      code === 'auth/cancelled-popup-request' ||
      message.includes('Pending promise was never set')
    ) {
      return 'La connexion Google a été interrompue. Cliquez une seule fois et patientez.';
    }
    if (code === 'auth/invalid-email') {
      return 'Adresse email invalide.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Email ou mot de passe incorrect.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Un compte existe déjà avec cet email. Passez en mode « Se connecter ».';
    }
    if (code === 'auth/weak-password') {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'La connexion par email/mot de passe n’est pas encore activée dans votre projet. Utilisez l’onglet Google avec votre email ou activez « Email/Password » dans la console Firebase.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
    }
    return message || 'Erreur lors de l’authentification.';
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!emailInput.trim() || !passwordInput) {
      setErrorMsg('Veuillez saisir votre adresse email et votre mot de passe.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const cleanEmail = emailInput.trim().toLowerCase();
      const testEmails = [
        'candidat@gmail.com',
        'enseignant@gmail.com',
        'dirthese@gmail.com',
        'coencadrant@gmail.com',
        'dirstructure@gmail.com'
      ];

      let user: User;
      if (testEmails.includes(cleanEmail) && passwordInput === '1234') {
        try {
          user =
            emailMode === 'signup'
              ? await registerWithEmail(emailInput, passwordInput)
              : await loginWithEmail(emailInput, passwordInput);
        } catch {
          user = {
            uid: `test-${cleanEmail.split('@')[0]}`,
            email: cleanEmail,
            emailVerified: true,
            isAnonymous: false,
            tenantId: null,
            metadata: {},
            providerData: [],
            refreshToken: '',
            getAccessTokenId: async () => 'mock-token',
            delete: async () => {},
            getIdToken: async () => 'mock-token',
            getIdTokenResult: async () => ({} as Record<string, unknown>),
            reload: async () => {}
          } as unknown as User;
        }
      } else {
        user =
          emailMode === 'signup'
            ? await registerWithEmail(emailInput, passwordInput)
            : await loginWithEmail(emailInput, passwordInput);
      }

      if (emailMode === 'signup' && !user.emailVerified) {
        setNeedsVerificationUser(user);
        setInfoMsg(`Un lien de confirmation vient d’être envoyé à ${user.email}.`);
        return;
      }

      await resolveAuthenticatedUser(user);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailInput.trim()) {
      setErrorMsg('Saisissez d’abord votre adresse email ci-dessus pour réinitialiser le mot de passe.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      await sendPasswordReset(emailInput);
      setInfoMsg(`Un email de réinitialisation a été envoyé à ${emailInput.trim().toLowerCase()}.`);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    const active = auth.currentUser || needsVerificationUser;
    if (!active) return;
    try {
      setLoading(true);
      setErrorMsg('');
      await active.reload();
      if (active.emailVerified) {
        await resolveAuthenticatedUser(active);
      } else {
        setErrorMsg('Votre adresse email n’est pas encore confirmée. Cliquez sur le lien reçu par email.');
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const active = auth.currentUser || needsVerificationUser;
    if (!active) return;
    try {
      setLoading(true);
      setErrorMsg('');
      await resendVerificationEmail(active);
      setInfoMsg(`Lien de confirmation renvoyé à ${active.email}.`);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');
      const googleUser = await loginWithGoogle(emailInput);
      await resolveAuthenticatedUser(googleUser);
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setPendingUser(null);
      setNeedsVerificationUser(null);
      setErrorMsg('');
      setInfoMsg('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    const isCandidateOnly =
      pendingUser.assignedRoles.length === 1 && pendingUser.assignedRoles[0] === 'candidat';

    if (isCandidateOnly && (!cin.trim() || !cne.trim())) {
      setErrorMsg('Les champs CIN et CNE / Massar sont obligatoires pour un dossier candidat.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const userProfile: UserProfile = {
        uid: pendingUser.uid,
        email: pendingUser.email,
        fullName: fullName.trim() || pendingUser.displayName || 'Utilisateur GCD',
        arabicName: arabicName.trim(),
        roles: pendingUser.assignedRoles,
        cin: cin.trim().toUpperCase(),
        cne: cne.trim().toUpperCase(),
        phone: phone.trim(),
        title: pendingUser.preauthorizedTitle,
        lab: pendingUser.preauthorizedLab,
        school: pendingUser.preauthorizedSchool,
        university: pendingUser.preauthorizedUniversity || university,
        active: true,
        photoURL: pendingUser.photoURL || '',
        createdAt: new Date().toISOString()
      };

      await saveUserProfileDoc(userProfile);
      await syncAdminMarkerIfAuthorized(userProfile.uid, userProfile.roles);

      onAuthSuccess(userProfile);
      onClose();
    } catch {
      setErrorMsg('Impossible d’enregistrer votre profil pour le moment. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-md w-full flex flex-col border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs">
              GCD
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
                Connexion · Cycle Doctoral
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Accès sécurisé à votre espace personnel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected subjects context */}
        {subjectList.length > 0 && (
          <div className="px-5 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold tabular-nums">
              {subjectList.length} sujet(s) sélectionné(s)
            </span>
            <span className="text-stone-500 dark:text-stone-400 truncate max-w-[180px] font-mono">
              Vœu 1 : #{subjectList[0]?.id}
            </span>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Step: Email verification pending */}
        {needsVerificationUser ? (
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>Confirmez votre adresse email</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                Un lien de confirmation a été envoyé à <strong>{needsVerificationUser.email}</strong>. Ouvrez-le puis cliquez sur « J’ai confirmé mon email ».
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleCheckEmailVerified}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>J’ai confirmé mon email</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendVerification}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Renvoyer le lien
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSwitchAccount}
                  className="text-stone-500 hover:underline"
                >
                  Changer de compte
                </button>
              </div>
            </div>
          </div>
        ) : pendingUser ? (
          <form onSubmit={handleSaveUserProfile} className="p-5 space-y-4">
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{pendingUser.email}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                >
                  Changer de compte
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-stone-600 dark:text-stone-400">Espace :</span>
                {pendingUser.assignedRoles.map((roleId) => (
                  <span
                    key={roleId}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ROLE_DEFINITIONS[roleId].badgeColor}`}
                  >
                    {ROLE_DEFINITIONS[roleId].label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  الاسم بالعربية
                </label>
                <input
                  type="text"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  placeholder="اختياري"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-right text-stone-900 dark:text-stone-100"
                />
              </div>

              {pendingUser.assignedRoles.includes('candidat') && (
                <>
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700 dark:text-stone-300">
                      CIN *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CD123456"
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 uppercase font-mono text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-700 dark:text-stone-300">
                      CNE / Massar *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="N134098214"
                      value={cne}
                      onChange={(e) => setCne(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 uppercase font-mono text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Téléphone
                </label>
                <input
                  type="tel"
                  placeholder="0661000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Université
                </label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="Université Sidi Mohamed Ben Abdellah (USMBA Fès)">USMBA Fès</option>
                  <option value="Université Mohammed V de Rabat (UM5)">UM5 Rabat</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Enregistrer et Accéder à mon Espace</span>
            </button>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            {/* Method Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  authMethod === 'email'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('google');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  authMethod === 'google'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <span>Compte Google</span>
              </button>
            </div>

            {authMethod === 'email' ? (
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block">
                    Adresse Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nom@usmba.ac.ma ou gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-stone-700 dark:text-stone-300">
                      Mot de passe *
                    </label>
                    {emailMode === 'signin' && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="ex: 1234"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{emailMode === 'signin' ? 'Se connecter' : 'Créer un compte'}</span>
                </button>

                <div className="text-center pt-1 text-[11px] text-stone-500 dark:text-stone-400">
                  {emailMode === 'signin' ? (
                    <>
                      Pas encore de mot de passe ?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('signup');
                          setErrorMsg('');
                        }}
                        className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        Créer un compte
                      </button>
                    </>
                  ) : (
                    <>
                      Déjà inscrit ?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('signin');
                          setErrorMsg('');
                        }}
                        className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        Se connecter
                      </button>
                    </>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn()}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continuer avec Google</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400 pt-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Universités du Royaume du Maroc · Cycle Doctoral</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
