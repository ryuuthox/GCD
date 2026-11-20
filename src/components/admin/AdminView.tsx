import React, { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Shield,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Layers,
  History,
  Search,
  Edit3
} from 'lucide-react';
import {
  AuditLogEntry,
  Candidate,
  DoctoralSubject,
  GcdRole,
  GcdSection,
  UserAccount,
  UserProfile
} from '../../domain/types';
import { ROLE_DEFINITIONS, hasPrivilege } from '../../domain/rbac';

interface AdminViewProps {
  activeSection?: GcdSection;
  currentUser: UserProfile;
  userAccounts: UserAccount[];
  subjects: DoctoralSubject[];
  candidates: Candidate[];
  auditLogs: AuditLogEntry[];
  onSaveAccountWithRoles: (account: UserAccount, roles: GcdRole[], isNew?: boolean) => Promise<void>;
  onToggleAccountStatus: (account: UserAccount) => Promise<void>;
}

const ALL_ROLES: GcdRole[] = [
  'candidat',
  'enseignant',
  'directeur_these',
  'co_encadrant',
  'directeur_structure',
  'admin'
];

export const AdminView: React.FC<AdminViewProps> = ({
  activeSection,
  currentUser,
  userAccounts,
  subjects,
  candidates,
  auditLogs,
  onSaveAccountWithRoles,
  onToggleAccountStatus
}) => {
  const sectionToTab = (sec?: GcdSection) => {
    if (sec === 'audit_logs') return 'audit';
    if (sec === 'universites_structures') return 'universites';
    if (sec === 'vue_globale') return 'vue_globale';
    return 'comptes';
  };

  const [activeTab, setActiveTab] = useState<'comptes' | 'audit' | 'universites' | 'vue_globale'>(
    sectionToTab(activeSection)
  );

  useEffect(() => {
    if (activeSection) {
      setActiveTab(sectionToTab(activeSection));
    }
  }, [activeSection]);

  // Create / Edit Account Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<GcdRole[]>(['enseignant', 'directeur_these']);
  const [title, setTitle] = useState("Professeur de l'Enseignement Supérieur (PES)");
  const [university, setUniversity] = useState(
    'Université Sidi Mohamed Ben Abdellah (USMBA Fès)'
  );
  const [school, setSchool] = useState('École Supérieure de Technologie (EST Fès)');
  const [lab, setLab] = useState('Laboratoire Sciences Ingénierie et Gestion (LSIG)');

  // Audit Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState<string>('all');

  const canManageUsers = hasPrivilege(currentUser, 'USER_MANAGE');
  const canAssignRoles = hasPrivilege(currentUser, 'ROLE_ASSIGN');
  const canViewAudit = hasPrivilege(currentUser, 'AUDIT_VIEW');

  const openCreateModal = () => {
    setEditingAccount(null);
    setFullName('');
    setEmail('');
    setSelectedRoles(['enseignant', 'directeur_these']);
    setTitle("Professeur de l'Enseignement Supérieur (PES)");
    setModalOpen(true);
  };

  const openEditRolesModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFullName(acc.fullName);
    setEmail(acc.email);
    setSelectedRoles(acc.roles && acc.roles.length > 0 ? acc.roles : [acc.role]);
    setTitle(acc.title);
    setUniversity(acc.university);
    setSchool(acc.school);
    setLab(acc.lab);
    setModalOpen(true);
  };

  const toggleRoleSelection = (roleId: GcdRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.length > 1 ? prev.filter((r) => r !== roleId) : prev;
      }
      return [...prev, roleId];
    });
  };

  const handleSaveAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const accountData: UserAccount = editingAccount
      ? {
          ...editingAccount,
          fullName,
          email: email.trim().toLowerCase(),
          title,
          university,
          school,
          lab,
          roles: selectedRoles,
          role: selectedRoles[0]
        }
      : {
          id: `ACC-${Date.now().toString().slice(-4)}`,
          email: email.trim().toLowerCase(),
          fullName,
          roles: selectedRoles,
          role: selectedRoles[0],
          title,
          university,
          school,
          lab,
          active: true,
          createdAt: new Date().toLocaleDateString('fr-FR')
        };

    await onSaveAccountWithRoles(accountData, selectedRoles, !editingAccount);
    setModalOpen(false);
  };

  const filteredAuditLogs = auditLogs
    .filter((log) => (auditTargetFilter === 'all' ? true : log.targetType === auditTargetFilter))
    .filter((log) => {
      const q = auditSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.targetLabel.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });

  const modalInputClass =
    'w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>Administration Centrale</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Gestion des Comptes, Audit & Établissements
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Attribution des rôles utilisateurs et consultation du journal d’audit.
          </p>
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs self-start sm:self-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Compte & Attribuer Rôles</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('comptes')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'comptes'
              ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="tabular-nums">Comptes & Rôles RBAC ({userAccounts.length})</span>
        </button>

        {canViewAudit && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="tabular-nums">Journal d’Audit ({auditLogs.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('universites')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'universites'
              ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Universités & Établissements</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vue_globale')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'vue_globale'
              ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="tabular-nums">Vue Globale ({candidates.length} dossiers)</span>
        </button>
      </div>

      {/* TAB 1: Comptes & Rôles */}
      {activeTab === 'comptes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Rôles RBAC Assignés</th>
                  <th className="py-3 px-4">Université & Laboratoire</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {userAccounts.map((acc) => {
                  const rolesList = acc.roles && acc.roles.length > 0 ? acc.roles : [acc.role];
                  return (
                    <tr key={acc.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30">
                      <td className="py-3 px-4">
                        <strong className="text-stone-900 dark:text-stone-100 block">
                          {acc.fullName}
                        </strong>
                        <span className="text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                          {acc.email}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {rolesList.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ROLE_DEFINITIONS[r]?.badgeColor}`}
                            >
                              {ROLE_DEFINITIONS[r]?.label || r}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {acc.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                        <div>{acc.lab}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          {acc.school} · {acc.university}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                            acc.active
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {acc.active ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {acc.active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canAssignRoles && (
                            <button
                              type="button"
                              onClick={() => openEditRolesModal(acc)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3 h-3" /> Rôles
                            </button>
                          )}
                          {canManageUsers && (
                            <button
                              type="button"
                              onClick={() => onToggleAccountStatus(acc)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                              {acc.active ? 'Désactiver' : 'Activer'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Journal d'Audit & Traçabilité */}
      {activeTab === 'audit' && canViewAudit && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Rechercher par acteur, action, objet cible, CIN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <select
              value={auditTargetFilter}
              onChange={(e) => setAuditTargetFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">Tous les objets ({auditLogs.length})</option>
              <option value="application">Candidatures</option>
              <option value="document">Pièces Justificatives</option>
              <option value="pv">PV Entretiens</option>
              <option value="subject">Sujets de Thèse</option>
              <option value="report">Rapports Annuels</option>
              <option value="user">Comptes & Rôles</option>
              <option value="calendar">Calendrier</option>
            </select>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  <th className="py-3 px-4">Horodatage (Quand)</th>
                  <th className="py-3 px-4">Acteur (Qui)</th>
                  <th className="py-3 px-4">Opération (Quoi)</th>
                  <th className="py-3 px-4">Objet Affecté</th>
                  <th className="py-3 px-4">Détails & Transitions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30">
                    <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {log.actorName}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        {log.actorEmail}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {log.actorRoles.map((r) => (
                          <span
                            key={r}
                            className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[9px] font-semibold text-stone-600 dark:text-stone-300"
                          >
                            {ROLE_DEFINITIONS[r]?.label || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-teal-700 dark:text-teal-400 block">
                        {log.actionLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                        {log.targetLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-300 max-w-xs">
                      <p className="text-[11px]">{log.details}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Universités & Établissements */}
      {activeTab === 'universites' && (
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-stone-100">
              <Building className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Université Sidi Mohamed Ben Abdellah (USMBA Fès)
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Établissements partenaires : École Supérieure de Technologie (EST Fès), Faculté des Sciences et Techniques (FST Fès), Faculté des Sciences Dhar El Mahraz (FSDM).
            </p>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl space-y-1">
              <div className="font-semibold text-stone-800 dark:text-stone-200">
                Laboratoire rattaché actif :
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                · Laboratoire Sciences Ingénierie et Gestion (LSIG)
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-stone-100">
              <Building className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Université Mohammed V de Rabat (UM5)
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Établissements partenaires : École Mohammadia d’Ingénieurs (EMI Rabat), Faculté des Sciences de Rabat (FSR).
            </p>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl space-y-1">
              <div className="font-semibold text-stone-800 dark:text-stone-200">
                Laboratoire rattaché actif :
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                · Laboratoire Énergie Propre & Systèmes Intelligents (LEPSI)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Vue Globale */}
      {activeTab === 'vue_globale' && (
        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              Total Sujets Doctoraux
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
              {subjects.length}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Validés et en examen
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              Candidatures Enregistrées
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
              {candidates.length}
            </div>
            <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
              Suivi cycle de vie actif
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-stone-500 dark:text-stone-400 font-semibold">
              Événements d’Audit Enregistrés
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-stone-100">
              {auditLogs.length}
            </div>
            <div className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
              Traçabilité complète active
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Multi-Role Account */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-lg w-full p-5 border border-stone-200 dark:border-stone-800 text-xs space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {editingAccount
                  ? `Modifier les Rôles RBAC : ${editingAccount.fullName}`
                  : 'Créer un Compte & Attribuer des Rôles Multiples'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Rôles RBAC attribués (sélection multiple autorisée) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((roleId) => {
                    const checked = selectedRoles.includes(roleId);
                    const def = ROLE_DEFINITIONS[roleId];
                    return (
                      <label
                        key={roleId}
                        className={`p-2 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                          checked
                            ? 'border-emerald-700 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                            : 'border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRoleSelection(roleId)}
                          className="mt-0.5 accent-emerald-700"
                        />
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {def.label}
                          </div>
                          <div className="text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">
                            {def.privileges.length} privilèges
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: Pr. Khalid MANSOURI"
                    className={modalInputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Email Google / Académique *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingAccount)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@usmba.ac.ma"
                    className={`${modalInputClass} disabled:opacity-60`}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Titre / Fonction
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={modalInputClass}
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Université *
                </label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className={modalInputClass}
                >
                  <option value="Université Sidi Mohamed Ben Abdellah (USMBA Fès)">
                    USMBA Fès
                  </option>
                  <option value="Université Mohammed V de Rabat (UM5)">UM5 Rabat</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className={modalInputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Laboratoire *
                  </label>
                  <input
                    type="text"
                    required
                    value={lab}
                    onChange={(e) => setLab(e.target.value)}
                    className={modalInputClass}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold rounded-lg shadow-xs transition-colors"
                >
                  {editingAccount ? 'Enregistrer les Rôles' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
