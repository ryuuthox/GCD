import React, { useState } from 'react';
import {
  Search,
  X,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Layers
} from 'lucide-react';
import { DoctoralSubject, DoctoralCalendarEvent } from '../../domain/types';

interface PublicSubjectsCatalogProps {
  subjects: DoctoralSubject[];
  selectedSubjects: DoctoralSubject[];
  onToggleSelectSubject: (subject: DoctoralSubject) => void;
  onApplySelected: (selected: DoctoralSubject[]) => void;
  onReorderSubjects?: (reordered: DoctoralSubject[]) => void;
  currentUser?: { fullName?: string; email?: string } | null;
  maxAllowed?: number;
  canApply?: boolean;
  calendarEvents?: DoctoralCalendarEvent[];
  onNavigateToCalendar?: () => void;
}

export const PublicSubjectsCatalog: React.FC<PublicSubjectsCatalogProps> = ({
  subjects,
  selectedSubjects,
  onToggleSelectSubject,
  onApplySelected,
  onReorderSubjects,
  currentUser,
  maxAllowed = 3,
  canApply = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Record<string, boolean>>({});
  const [limitNotice, setLimitNotice] = useState(false);

  const universities = [
    'all',
    'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    'Université Mohammed V de Rabat (UM5)'
  ];

  const domains = [
    'all',
    'Intelligence Artificielle & Traitement du Langage',
    'Cybersécurité & Réseaux',
    "Sécurité de l'Information & IA",
    'FinTech & Deep Learning',
    'Énergies Renouvelables & IoT'
  ];

  const filteredSubjects = subjects.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      !query ||
      s.title.toLowerCase().includes(query) ||
      s.supervisorName.toLowerCase().includes(query) ||
      s.labName.toLowerCase().includes(query) ||
      (s.keywords && s.keywords.some((k) => k.toLowerCase().includes(query)));
    const matchUniv = selectedUniversity === 'all' || s.university === selectedUniversity;
    const matchDomain = selectedDomain === 'all' || s.domain === selectedDomain;
    return matchSearch && matchUniv && matchDomain;
  });

  const toggleExpand = (id: string) => {
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggle = (subject: DoctoralSubject) => {
    const isAlready = selectedSubjects.some((s) => s.id === subject.id);
    if (!isAlready && selectedSubjects.length >= maxAllowed) {
      setLimitNotice(true);
      setTimeout(() => setLimitNotice(false), 3500);
      return;
    }
    setLimitNotice(false);
    onToggleSelectSubject(subject);
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    if (!onReorderSubjects) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedSubjects.length) return;

    const list = [...selectedSubjects];
    const [moved] = list.splice(index, 1);
    list.splice(newIdx, 0, moved);
    onReorderSubjects(list);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Editorial Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Campagne Nationale de Doctorat · Session 2026/2027
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Catalogue des Sujets de Thèse Disponibles
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {canApply
              ? `Sélectionnez jusqu'à ${maxAllowed} sujets par ordre de préférence avant de postuler.`
              : 'Consultez les sujets de thèse ouverts et leur structure de recherche.'}
          </p>
        </div>

        {canApply && selectedSubjects.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 tabular-nums whitespace-nowrap">
              {selectedSubjects.length}/{maxAllowed} vœu(x) sélectionné(s)
            </span>
            <button
              type="button"
              onClick={() => onApplySelected(selectedSubjects)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Postuler maintenant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Limit Notice Toast */}
      {limitNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>
            Règle officielle : Chaque candidat a droit à 3 candidatures au maximum (Vœu 1, Vœu 2, Vœu 3).
          </span>
          <button
            type="button"
            onClick={() => setLimitNotice(false)}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par sujet, mot-clé, professeur encadrant, laboratoire..."
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="text-xs py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">Toutes les Universités</option>
          {universities
            .filter((u) => u !== 'all')
            .map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
        </select>

        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="text-xs py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">Tous les Domaines</option>
          {domains
            .filter((d) => d !== 'all')
            .map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
        </select>
      </div>

      {/* Results Summary Line */}
      <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center justify-between gap-2 tabular-nums">
        <span>{filteredSubjects.length} sujet(s) de doctorat disponible(s)</span>
        <span className="text-[11px] text-stone-400 dark:text-stone-500">
          Cliquez sur « Détails » pour consulter le descriptif complet de la thèse
        </span>
      </div>

      {/* Subjects List */}
      <div className="space-y-3">
        {filteredSubjects.map((subject) => {
          const selectedIndex = selectedSubjects.findIndex((s) => s.id === subject.id);
          const isSelected = selectedIndex !== -1;
          const isExpanded = !!expandedSubjectIds[subject.id];

          return (
            <div
              key={subject.id}
              className={`rounded-xl border transition-colors overflow-hidden ${
                isSelected
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-600 dark:border-emerald-500'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Unboxed Typographic Metadata Line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Réf. #{subject.id}
                    </span>
                    <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
                      ·
                    </span>
                    <span className="text-stone-600 dark:text-stone-400">{subject.domain}</span>
                    <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
                      ·
                    </span>
                    <span className="font-mono text-stone-600 dark:text-stone-300 tabular-nums">
                      {subject.remainingSlots} place(s)
                    </span>
                    {isSelected && (
                      <>
                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
                          ·
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Vœu N° {selectedIndex + 1}
                        </span>
                      </>
                    )}
                  </div>

                  <h3
                    onClick={() => toggleExpand(subject.id)}
                    className="font-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                  >
                    {subject.title}
                  </h3>

                  <div className="text-xs text-stone-600 dark:text-stone-400 flex flex-wrap items-center gap-1.5">
                    <strong className="text-stone-800 dark:text-stone-200">
                      Pr. {subject.supervisorName}
                    </strong>
                    <span aria-hidden="true">·</span>
                    <span>{subject.labName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-500 dark:text-stone-400">{subject.schoolName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => toggleExpand(subject.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Détails</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {canApply && (
                    <button
                      type="button"
                      onClick={() => handleToggle(subject)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                          : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isSelected ? 'Retirer' : 'Choisir ce sujet'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 text-xs space-y-4">
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">
                        Université d'attachement
                      </span>
                      <strong className="text-stone-900 dark:text-stone-100">
                        {subject.university}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">
                        Grade de l'encadrant
                      </span>
                      <span className="text-stone-800 dark:text-stone-200">
                        {subject.supervisorTitle}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">
                        Contact institutionnel
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                        {subject.contactEmail || subject.supervisorEmail}
                      </span>
                    </div>
                  </div>

                  {subject.eligibleMajors && subject.eligibleMajors.length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1">
                        Filières de Master / Ingénieur conformes
                      </span>
                      <div className="text-xs font-medium text-stone-800 dark:text-stone-200">
                        {subject.eligibleMajors.join(' · ')}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1">
                      Descriptif & Problématique scientifique
                    </span>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                      {subject.description}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1">
                      Prérequis & Compétences recommandées
                    </span>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      {subject.prerequisites}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar for Multi-Subject Choices */}
      {canApply && selectedSubjects.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 shrink-0 flex items-center gap-1.5 tabular-nums">
                <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                Vœux ({selectedSubjects.length}/{maxAllowed}) :
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {selectedSubjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1 rounded-lg text-xs shrink-0"
                  >
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      #{idx + 1}
                    </span>
                    <span
                      className="truncate max-w-[140px] text-stone-800 dark:text-stone-200"
                      title={sub.title}
                    >
                      {sub.title}
                    </span>
                    {selectedSubjects.length > 1 && (
                      <div className="flex items-center ml-1 border-l border-stone-300 dark:border-stone-700 pl-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePriority(idx, 'up')}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 disabled:opacity-25 p-0.5"
                          title="Monter la priorité"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedSubjects.length - 1}
                          onClick={() => movePriority(idx, 'down')}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 disabled:opacity-25 p-0.5"
                          title="Descendre la priorité"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggle(sub)}
                      className="text-stone-400 hover:text-rose-600 p-0.5 ml-0.5"
                      title="Retirer ce vœu"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onApplySelected(selectedSubjects)}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-95 rounded-lg flex items-center justify-center gap-1.5 transition-all shrink-0 whitespace-nowrap"
            >
              <span>
                {currentUser
                  ? `Postuler avec mes ${selectedSubjects.length} vœu(x)`
                  : 'Se connecter & Postuler'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
