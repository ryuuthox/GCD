import { ApplicationDocument, DocumentTypeKey, DocumentValidationStatus } from './types';

export interface DocumentTypeConfig {
  key: DocumentTypeKey;
  label: string;
  description: string;
  required: boolean;
  allowedMimeTypes: string[];
  acceptAttr: string;
  maxSizeBytes: number;
}

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const INLINE_PREVIEW_MAX_BYTES = 450 * 1024; // Keep under Firestore 1 MB document limit

export const DOCUMENT_REQUIREMENTS: DocumentTypeConfig[] = [
  {
    key: 'masterOriginal',
    label: 'Diplôme de Master / Ingénieur (ou Attestation)',
    description: 'Copie scannée lisible du diplôme donnant accès au cycle doctoral.',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'licenceCopies',
    label: 'Diplôme de Licence & Relevés de Notes',
    description: 'Relevés des semestres S1–S6 ou diplôme DEUG/DUT + Licence.',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'bacOriginal',
    label: 'Baccalauréat & Relevé de Notes',
    description: 'Copie recto-verso du Baccalauréat.',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'cinCopy',
    label: 'Carte Nationale d’Identité (CIN)',
    description: 'Copie recto-verso en cours de validité.',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'cvPdf',
    label: 'Curriculum Vitae (CV Académique)',
    description: 'Parcours universitaire, stages, compétences et publications.',
    required: true,
    allowedMimeTypes: ['application/pdf'],
    acceptAttr: '.pdf',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'projetRecherchePdf',
    label: 'Projet de Recherche / Note d’Intention',
    description: 'Problématique, méthodologie et bibliographie préliminaire (2 à 5 pages).',
    required: true,
    allowedMimeTypes: ['application/pdf'],
    acceptAttr: '.pdf',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'deugDutCopies',
    label: 'Diplôme DEUG / DUT / CPGE (Optionnel)',
    description: 'Attestation de réussite des deux premières années universitaires.',
    required: false,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  },
  {
    key: 'ficheSigneePhysique',
    label: 'Fiche d’Inscription Signée Physiquement',
    description: 'Fiche imprimée, signée à l’encre par le candidat et numérisée.',
    required: false,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    acceptAttr: '.pdf,.jpg,.jpeg,.png',
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES
  }
];

export function getDocumentConfig(docType: DocumentTypeKey): DocumentTypeConfig {
  return (
    DOCUMENT_REQUIREMENTS.find((d) => d.key === docType) || DOCUMENT_REQUIREMENTS[0]
  );
}

export function validateFileForDocumentType(
  file: File,
  docType: DocumentTypeKey
): { valid: boolean; error?: string } {
  const config = getDocumentConfig(docType);

  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Le fichier sélectionné est vide.' };
  }

  if (file.size > config.maxSizeBytes) {
    const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `La taille du fichier (${formatFileSize(file.size)}) dépasse la limite autorisée de ${maxMb} Mo.`
    };
  }

  // Fallback extension check when browser omits MIME type
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeAllowed = config.allowedMimeTypes.includes(file.type);
  const extAllowed =
    (ext === 'pdf' && config.allowedMimeTypes.includes('application/pdf')) ||
    ((ext === 'jpg' || ext === 'jpeg') && config.allowedMimeTypes.includes('image/jpeg')) ||
    (ext === 'png' && config.allowedMimeTypes.includes('image/png'));

  if (!mimeAllowed && !extAllowed) {
    return {
      valid: false,
      error: `Format non autorisé (${file.type || ext}). Formats acceptés : ${config.acceptAttr}`
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export function getDocumentStatusMeta(status: DocumentValidationStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'validated':
      return {
        label: 'Validé',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      };
    case 'rejected':
      return {
        label: 'Rejeté (Remplacement requis)',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
      };
    case 'additional_info_required':
      return {
        label: 'Complément requis',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      };
    default:
      return {
        label: 'En attente de vérification',
        badgeClass: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
      };
  }
}

export function checkAllRequiredDocumentsUploaded(docs: ApplicationDocument[]): {
  complete: boolean;
  missingLabels: string[];
  rejectedOrNeedsInfo: ApplicationDocument[];
} {
  const required = DOCUMENT_REQUIREMENTS.filter((r) => r.required);
  const missingLabels: string[] = [];

  for (const req of required) {
    const found = docs.find((d) => d.docType === req.key);
    if (!found) {
      missingLabels.push(req.label);
    }
  }

  const rejectedOrNeedsInfo = docs.filter(
    (d) => d.status === 'rejected' || d.status === 'additional_info_required'
  );

  return {
    complete: missingLabels.length === 0 && rejectedOrNeedsInfo.length === 0,
    missingLabels,
    rejectedOrNeedsInfo
  };
}
