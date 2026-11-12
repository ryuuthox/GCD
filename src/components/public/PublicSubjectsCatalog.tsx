import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Check, 
  Plus, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  ArrowUp, 
  ArrowDown, 
  Building, 
  Mail, 
  GraduationCap,
  Layers,
  Sparkles
} from 'lucide-react';
import { DoctoralSubject } from '../../types';

interface PublicSubjectsCatalogProps {
  subjects: DoctoralSubject[];
  selectedSubjects: DoctoralSubject[];
  onToggleSelectSubject: (subject: DoctoralSubject) => void;
  onApplySelected: (selected: DoctoralSubject[]) => void;
  onReorderSubjects?: (reordered: DoctoralSubject[]) => void;
  currentUser?: { fullName?: string; email?: string } | null;
  maxAllowed?: number;
  canApply?: boolean;
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
    'Sécurité de l\'Information & IA',
    'FinTech & Deep Learning',
    'Énergies Renouvelables & IoT'
  ];

  const filteredSubjects = subjects.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      s.title.toLowerCase().includes(query) ||
      s.supervisorName.toLowerCase().includes(query) ||
      s.labName.toLowerCase().includes(query) ||
      (s.keywords && s.keywords.some(k => k.toLowerCase().includes(query)));
    const matchUniv = selectedUniversity === 'all' || s.university === selectedUniversity;
    const matchDomain = selectedDomain === 'all' || s.domain === selectedDomain;
    return matchSearch && matchUniv && matchDomain;
  });

  const toggleExpand = (id: string) => {
    setExpandedSubjectIds(prev => ({
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
    <div className="space-y-5 pb-28">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            Campagne Nationale de Doctorat · Session 2026/2027
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Catalogue des Sujets de Thèse Disponibles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canApply
              ? `Sélectionnez jusqu'à ${maxAllowed} sujets par ordre de préférence avant de postuler.`
              : 'Consultez les sujets de thèse ouverts et leur structure de recherche.'}
          </p>
        </div>

        {canApply && selectedSubjects.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
              {selectedSubjects.length}/{maxAllowed} vœu(x) configuré(s)
            </span>
            <button
              type="button"
              onClick={() => onApplySelected(selectedSubjects)}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Postuler maintenant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Limit Notice Toast */}
      {limitNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>Règle officielle : Chaque candidat a droit à 3 candidatures au maximum (Vœu 1, Vœu 2, Vœu 3).</span>
          <button type="button" onClick={() => setLimitNotice(false)} className="text-amber-700 hover:text-amber-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Streamlined Search & Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par sujet, mot-clé, professeur encadrant, laboratoire..."
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* University Filter */}
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="all">Toutes les Universités</option>
          {universities.filter(u => u !== 'all').map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        {/* Domain Filter */}
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="all">Tous les Domaines</option>
          {domains.filter(d => d !== 'all').map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-500 px-1 flex items-center justify-between">
        <span>{filteredSubjects.length} sujet(s) de doctorat disponible(s)</span>
        <span className="text-[11px] text-slate-400">Cliquez sur « Détails » pour déployer les informations de chaque thèse</span>
      </div>

      {/* Expandable List of Subjects (Liste Extensible demandée par l'utilisateur) */}
      <div className="space-y-3">
        {filteredSubjects.map((subject) => {
          const selectedIndex = selectedSubjects.findIndex((s) => s.id === subject.id);
          const isSelected = selectedIndex !== -1;
          const isExpanded = !!expandedSubjectIds[subject.id];

          return (
            <div
              key={subject.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isSelected
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              {/* Compact Default Row (Intitulé, Encadrant, Structure, Action Détails, Choisir) */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      Réf. #{subject.id}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3" />
                        Vœu N° {selectedIndex + 1}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 truncate hidden md:inline">
                      {subject.domain}
                    </span>
                  </div>

                  <h3 
                    onClick={() => toggleExpand(subject.id)}
                    className="text-sm font-bold text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {subject.title}
                  </h3>

                  <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                    <strong className="text-slate-800 dark:text-slate-200">Pr. {subject.supervisorName}</strong>
                    <span>·</span>
                    <span>{subject.labName}</span>
                    <span>·</span>
                    <span className="text-slate-500">{subject.schoolName}</span>
                  </div>
                </div>

                {/* Right Actions: Places, Details Button & Select Button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {subject.remainingSlots} place(s)
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExpand(subject.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <span>Détails</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {canApply && (
                    <button
                      type="button"
                      onClick={() => handleToggle(subject)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                        isSelected
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                      }`}
                    >
                      {isSelected ? 'Retirer' : 'Choisir ce sujet'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Cell Details (Accessible au clic sur Détails) */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-3 animate-in fade-in duration-200">
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Université d'attachement :</span>
                      <strong className="text-slate-800 dark:text-slate-200">{subject.university}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Grade de l'encadrant :</span>
                      <span className="text-slate-800 dark:text-slate-200">{subject.supervisorTitle}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">Contact institutionnel :</span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">{subject.contactEmail || subject.supervisorEmail}</span>
                    </div>
                  </div>

                  {/* Filières conformes / admissibles */}
                  {subject.eligibleMajors && subject.eligibleMajors.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Filières de Master / Ingénieur conformes :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {subject.eligibleMajors.map((maj, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-medium">
                            {maj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problematic Description */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Descriptif & Problématique scientifique :
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                      {subject.description}
                    </p>
                  </div>

                  {/* Prerequisites */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Prérequis & Compétences recommandées :
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {subject.prerequisites}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar for Multi-Subject Choices (Max 3) with Priority Reordering */}
      {canApply && selectedSubjects.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Vœux ({selectedSubjects.length}/{maxAllowed}) :
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {selectedSubjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg text-xs shrink-0"
                  >
                    <span className="font-extrabold text-blue-700 dark:text-blue-300">#{idx + 1}</span>
                    <span className="truncate max-w-[130px] text-slate-800 dark:text-slate-200" title={sub.title}>
                      {sub.title}
                    </span>
                    {selectedSubjects.length > 1 && (
                      <div className="flex items-center ml-1 border-l border-blue-200 dark:border-blue-800 pl-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePriority(idx, 'up')}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-20 p-0.5"
                          title="Monter la priorité"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedSubjects.length - 1}
                          onClick={() => movePriority(idx, 'down')}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-20 p-0.5"
                          title="Descendre la priorité"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggle(sub)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 ml-1"
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
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <span>{currentUser ? `Postuler avec mes ${selectedSubjects.length} vœu(x)` : 'Se connecter & Postuler'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
