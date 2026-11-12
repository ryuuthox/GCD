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
    let interval: any;
    if (isSent && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
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
      const fakeSha = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const timestamp = new Date().toLocaleString('fr-FR', {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Compact Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Signature Électronique Certifiée
              </h3>
              <p className="text-[11px] text-slate-500">
                Loi 09-08 CNDP & Décret 1886.23
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Signature Validée !</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Le document a été scellé cryptographiquement et horodaté.
              </p>
            </div>
          ) : (
            <>
              {/* Document Info 1-line */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200/60 text-xs">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Signataire : {signatoryName} ({signatoryRole})
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate mt-0.5" title={documentTitle}>
                  {documentTitle}
                </div>
              </div>

              {/* Delivery Method Selection */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Canal de réception OTP
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('sms')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                      method === 'sms'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    SMS (+212 661-***210)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('email')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                      method === 'email'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email USMBA
                  </button>
                </div>
              </div>

              {/* Code Reminder */}
              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-2.5 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Code : <strong className="font-mono tracking-widest text-sm">{generatedCode}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setInputCode(generatedCode)}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-[11px] font-semibold"
                >
                  Insérer
                </button>
              </div>

              {/* OTP Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex: 123456"
                  className="w-full text-center tracking-widest font-mono text-lg py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errorMsg && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                  </p>
                )}
                <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                  <span>Temps restant : {timer}s</span>
                  {timer === 0 && (
                    <button type="button" onClick={handleSendCode} className="text-blue-600 hover:underline">
                      Renvoyer
                    </button>
                  )}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Signature électronique certifiée valant signature manuscrite (Loi 53-05 & CNSPCD).
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying || inputCode.length !== 6}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl shadow-xs"
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
