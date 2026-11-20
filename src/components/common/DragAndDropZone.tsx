import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { ApplicationDocument, DocumentTypeKey } from '../../domain/types';
import {
  formatFileSize,
  getDocumentConfig,
  getDocumentStatusMeta,
  validateFileForDocumentType
} from '../../domain/documents';

interface DragAndDropZoneProps {
  docType: DocumentTypeKey;
  label?: string;
  existingDoc?: ApplicationDocument;
  onFileSelected: (file: File, docType: DocumentTypeKey) => Promise<void> | void;
}

export const DragAndDropZone: React.FC<DragAndDropZoneProps> = ({
  docType,
  label,
  existingDoc,
  onFileSelected
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const config = getDocumentConfig(docType);
  const displayLabel = label || config.label;

  const handleFile = async (file: File) => {
    setValidationError(null);
    const check = validateFileForDocumentType(file, docType);
    if (!check.valid) {
      setValidationError(check.error || 'Fichier non conforme.');
      return;
    }

    try {
      setIsProcessing(true);
      await onFileSelected(file, docType);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setValidationError(e?.message || 'Erreur lors du dépôt du fichier.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const statusMeta = existingDoc ? getDocumentStatusMeta(existingDoc.status) : null;
  const needsReplacement =
    existingDoc?.status === 'rejected' || existingDoc?.status === 'additional_info_required';

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 flex justify-between items-center gap-2">
        <span className="truncate">
          {displayLabel} {config.required && <span className="text-rose-500">*</span>}
        </span>
        {statusMeta && (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 flex items-center gap-1 ${statusMeta.badgeClass}`}
          >
            {existingDoc?.status === 'validated' && <CheckCircle2 className="w-3 h-3" />}
            {existingDoc?.status === 'rejected' && <XCircle className="w-3 h-3" />}
            {existingDoc?.status === 'additional_info_required' && (
              <AlertTriangle className="w-3 h-3" />
            )}
            {existingDoc?.status === 'pending' && <Clock className="w-3 h-3" />}
            <span>{statusMeta.label}</span>
          </span>
        )}
      </div>

      {existingDoc && !needsReplacement ? (
        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                {existingDoc.fileName}
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                {formatFileSize(existingDoc.fileSizeBytes)} · {existingDoc.mimeType}
              </div>
            </div>
          </div>
          <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-stone-800 cursor-pointer shrink-0">
            Remplacer
            <input
              type="file"
              accept={config.acceptAttr}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-1.5">
          {needsReplacement && existingDoc?.rejectionReason && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 space-y-0.5">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Action requise ({existingDoc.fileName}) :</span>
              </div>
              <p>{existingDoc.rejectionReason}</p>
            </div>
          )}

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1 ${
              isDragging
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                : needsReplacement
                ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 bg-stone-50/40 dark:bg-stone-800/20'
            }`}
          >
            <input
              type="file"
              accept={config.acceptAttr}
              onChange={handleFileInputChange}
              className="hidden"
            />
            {isProcessing ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validation & enregistrement...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <UploadCloud className="w-4 h-4 text-stone-400" />
                  <span>
                    {needsReplacement ? 'Déposer le document corrigé' : 'Glissez le fichier ou'}{' '}
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      parcourez
                    </span>
                  </span>
                </div>
                <span className="text-[10px] text-stone-400">
                  Formats : {config.acceptAttr} · Max 5 Mo
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {validationError && (
        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
