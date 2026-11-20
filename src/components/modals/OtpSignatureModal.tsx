import React, { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, Mail, Lock, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface OtpSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  signatoryName: string;
  signatoryRole: string;
  onSignComplete: (signatureHash: string, timestamp: string) => void;
}

export const OtpSignatureModal: React.FC<OtpSignatureModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  signatoryName,
  signatoryRole,
  onSignComplete
}) => {
  const [method, setMethod] = useState<'sms' | 'email'>('sms');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isSent, setIsSent] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(60);
  const [consentAccepted, setConsentAccepted] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      handleSendCode();
    } else {
      setIsSuccess(false);
      setInputCode('');
      setErrorMsg('');
    }
  }, [isOpen, method]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isSent && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSent, timer]);

  const handleSendCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setIsSent(true);
    setTimer(60);
    setErrorMsg('');
  };

  const handleVerify = () => {
    if (!consentAccepted) {
      setErrorMsg('Veuillez accepter le consentement légal avant de signer.');
      return;
    }
    if (inputCode.trim() !== generatedCode) {
      setErrorMsg('Code OTP invalide. Vérifiez le code reçu.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      const fakeSha = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const timestamp =
        new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' GMT+1';

      setTimeout(() => {
        onSignComplete(fakeSha, timestamp);
        onClose();
      }, 1200);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Compact Header */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
                Signature Électronique Certifiée
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Loi 09-08 CNDP & Décret 1886.23
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

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                Signature Validée !
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                Le document a été scellé cryptographiquement et horodaté.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-stone-50 dark:bg-stone-800/40 rounded-xl p-2.5 border border-stone-200 dark:border-stone-700 text-xs">
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold">
                  Signataire : {signatoryName} ({signatoryRole})
                </div>
                <div
                  className="font-semibold text-stone-800 dark:text-stone-200 text-xs truncate mt-0.5"
                  title={documentTitle}
                >
                  {documentTitle}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1.5 block">
                  Canal de réception OTP
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('sms')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      method === 'sms'
                        ? 'border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    SMS (+212 661-***210)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('email')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      method === 'email'
                        ? 'border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email USMBA
                  </button>
                </div>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    Code : <strong className="font-mono tracking-widest text-sm">{generatedCode}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInputCode(generatedCode)}
                  className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded text-[11px] font-semibold"
                >
                  Insérer
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex: 123456"
                  className="w-full text-center tracking-widest font-mono text-lg py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errorMsg && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                  </p>
                )}
                <div className="flex justify-between items-center mt-1 text-[11px] text-stone-400 tabular-nums">
                  <span>Temps restant : {timer}s</span>
                  {timer === 0 && (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Renvoyer
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>
                    Signature électronique certifiée valant signature manuscrite (Loi 53-05 & CNSPCD).
                  </span>
                </label>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying || inputCode.length !== 6}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-40 rounded-xl transition-colors"
                >
                  {isVerifying ? 'Vérification...' : 'Confirmer et Signer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
