import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import {
  ApplicationDocument,
  Candidate,
  DoctoralCalendarEvent,
  InterviewPv,
  UserProfile
} from '../../domain/types';
import { ROLE_DEFINITIONS, hasPrivilege } from '../../domain/rbac';
import { LifecycleTimeline } from '../common/LifecycleTimeline';

interface CalendarTrackingViewProps {
  events: DoctoralCalendarEvent[];
  currentUser: UserProfile | null;
  candidateApplication?: Candidate;
  documents?: ApplicationDocument[];
  pvs?: InterviewPv[];
  onSaveEvent?: (event: DoctoralCalendarEvent) => void;
  onDeleteEvent?: (event: DoctoralCalendarEvent) => void;
}

const STAGE_COLORS: Record<DoctoralCalendarEvent['stageCode'], string> = {
  campagne_sujets: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
  depot_candidatures: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
  verification_docs: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300',
  entretiens_oraux: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300',
  visa_structure: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
  inscription_finale: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300',
  reinscription: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
};

export const CalendarTrackingView: React.FC<CalendarTrackingViewProps> = ({
  events,
  currentUser,
  candidateApplication,
  documents = [],
  pvs = [],
  onSaveEvent,
  onDeleteEvent
}) => {
  // Default view to October/November 2026 campaign window
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(9); // 0-indexed: 9 = October, 10 = November
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-26');
  const [modalOpen, setModalOpen] = useState(false);

  // Add event modal fields
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evStage, setEvStage] = useState<DoctoralCalendarEvent['stageCode']>('depot_candidatures');
  const [evStart, setEvStart] = useState('2026-11-01');
  const [evEnd, setEvEnd] = useState('2026-11-15');
  const [evCritical, setEvCritical] = useState(true);

  const canManageCalendar = hasPrivilege(currentUser, 'CALENDAR_MANAGE');
  const isCandidateOnly =
    currentUser?.roles.includes('candidat') && !currentUser.roles.includes('directeur_structure');

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDayStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  const eventsOnDate = (dateStr: string) =>
    events.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);

  const selectedDayEvents = eventsOnDate(selectedDateStr);
  const criticalDeadlines = [...events]
    .filter((e) => e.isCriticalDeadline)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveEvent) return;
    const safeEndDate = evEnd < evStart ? evStart : evEnd;
    onSaveEvent({
      id: `CAL-${Date.now().toString().slice(-5)}`,
      title: evTitle,
      description: evDesc,
      stageCode: evStage,
      startDate: evStart,
      endDate: safeEndDate,
      responsibleRoles: ['candidat', 'directeur_these', 'directeur_structure'],
      isCriticalDeadline: evCritical,
      university: 'Toutes les Universités'
    });
    setModalOpen(false);
    setEvTitle('');
    setEvDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Calendar className="w-4 h-4" />
            <span>Calendrier Interactif & Suivi Visuel de Campagne Doctorale</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Échéances Officielles & Étapes d’Admission 2026/2027
          </h1>
          <p className="text-xs text-slate-500">
            Consultez les fenêtres de dépôt, entretiens oraux, visas et dates limites critiques.
          </p>
        </div>

        {canManageCalendar && onSaveEvent && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Échéance</span>
          </button>
        )}
      </div>

      {/* Candidate Lifecycle Visual Progress Tracker (privacy-preserving: shown to candidate or supervisors, not exposed on Structure progress tab) */}
      {isCandidateOnly && candidateApplication && (
        <LifecycleTimeline
          application={candidateApplication}
          documents={documents}
          pvs={pvs}
          currentUser={currentUser}
          compact
        />
      )}

      {/* Critical Deadlines Strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {criticalDeadlines.slice(0, 4).map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => {
              const [y, m] = ev.endDate.split('-').map(Number);
              if (y && m) {
                setViewYear(y);
                setViewMonth(m - 1);
                setSelectedDateStr(ev.endDate);
              }
            }}
            className="text-left p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 hover:border-rose-400 transition-all shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-rose-600 dark:text-rose-400">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Échéance Critique
              </span>
              <span className="font-mono">{ev.endDate}</span>
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
              {ev.title}
            </div>
            <div className="text-[11px] text-slate-500">
              Du {ev.startDate} au {ev.endDate}
            </div>
          </button>
        ))}
      </div>

      {/* Interactive Calendar Grid + Selected Date Agenda */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Monthly Calendar */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {monthNames[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-14 rounded-xl bg-slate-50/40 dark:bg-slate-950/30" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = formatDayStr(day);
              const dayEvents = eventsOnDate(dateStr);
              const isSelected = selectedDateStr === dateStr;
              const hasDeadline = dayEvents.some((e) => e.endDate === dateStr && e.isCriticalDeadline);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-14 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/50 ring-2 ring-blue-500/20'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {day}
                    </span>
                    {hasDeadline && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Date limite" />
                    )}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={`h-1.5 flex-1 rounded-full ${
                            ev.isCriticalDeadline ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details & Timeline List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Périodes actives le {selectedDateStr}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedDayEvents.length} étape(s)
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Aucune étape planifiée à cette date.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${STAGE_COLORS[ev.stageCode]}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{ev.title}</span>
                      {ev.isCriticalDeadline && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold">
                          Critique
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">{ev.description}</p>
                    <div className="text-[10px] opacity-80 flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono">{ev.startDate} → {ev.endDate}</span>
                      <span>
                        {ev.responsibleRoles
                          .map((r) => ROLE_DEFINITIONS[r]?.label || r)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Campaign Roadmap */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Feuille de Route Complète de la Campagne
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...events]
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map((ev) => {
                  const isPast = ev.endDate < '2026-10-26';
                  const isActive = '2026-10-26' >= ev.startDate && '2026-10-26' <= ev.endDate;
                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2">
                        {isPast ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : isActive ? (
                          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        ) : (
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{ev.title}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {ev.startDate} → {ev.endDate}
                          </div>
                        </div>
                      </div>

                      {canManageCalendar && onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(ev)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Supprimer cette échéance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Calendar Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nouvelle Échéance du Calendrier Doctoral
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Titre de l’étape *</label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="ex: Session de rattrapage entretiens"
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Phase concernée</label>
                <select
                  value={evStage}
                  onChange={(e) => setEvStage(e.target.value as DoctoralCalendarEvent['stageCode'])}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="campagne_sujets">Campagne Sujets</option>
                  <option value="depot_candidatures">Dépôt Candidatures</option>
                  <option value="verification_docs">Vérification Documentaire</option>
                  <option value="entretiens_oraux">Entretiens Oraux</option>
                  <option value="visa_structure">Visa Direction Structure</option>
                  <option value="inscription_finale">Inscription Finale</option>
                  <option value="reinscription">Réinscription & Rapports</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Date de début</label>
                  <input
                    type="date"
                    required
                    value={evStart}
                    onChange={(e) => setEvStart(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Date de fin</label>
                  <input
                    type="date"
                    required
                    min={evStart}
                    value={evEnd < evStart ? evStart : evEnd}
                    onChange={(e) => setEvEnd(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={evCritical}
                  onChange={(e) => setEvCritical(e.target.checked)}
                />
                <span>Marquer comme échéance critique</span>
              </label>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
