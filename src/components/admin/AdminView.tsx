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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <Shield className="w-4 h-4" />
            <span>Administration Centrale</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Gestion des Comptes, Audit & Établissements
          </h1>
          <p className="text-xs text-slate-500">
            Attribution des rôles utilisateurs et consultation du journal d’audit.
          </p>
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Compte & Attribuer Rôles</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('comptes')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'comptes'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Comptes & Rôles RBAC ({userAccounts.length})</span>
        </button>

        {canViewAudit && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal d’Audit ({auditLogs.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('universites')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'universites'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
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
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vue Globale ({candidates.length} dossiers)</span>
        </button>
      </div>

      {/* TAB 1: Comptes & Rôles */}
      {activeTab === 'comptes' && (
        <div className="space-y-4">

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Rôles RBAC Assignés</th>
                  <th className="py-3 px-4">Université & Laboratoire</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userAccounts.map((acc) => {
                  const rolesList = acc.roles && acc.roles.length > 0 ? acc.roles : [acc.role];
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 dark:text-white block">
                          {acc.fullName}
                        </strong>
                        <span className="text-slate-400 font-mono text-[11px]">{acc.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {rolesList.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${ROLE_DEFINITIONS[r]?.badgeColor}`}
                            >
                              {ROLE_DEFINITIONS[r]?.label || r}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{acc.title}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{acc.lab}</div>
                        <div className="text-[11px] text-slate-400">
                          {acc.school} · {acc.university}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                            acc.active ? 'text-emerald-600' : 'text-slate-400'
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
                              className="px-2.5 py-1 rounded text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Rôles
                            </button>
                          )}
                          {canManageUsers && (
                            <button
                              type="button"
                              onClick={() => onToggleAccountStatus(acc)}
                              className="px-2.5 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Rechercher par acteur, action, objet cible, CIN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <select
              value={auditTargetFilter}
              onChange={(e) => setAuditTargetFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Horodatage (Quand)</th>
                  <th className="py-3 px-4">Acteur (Qui)</th>
                  <th className="py-3 px-4">Opération (Quoi)</th>
                  <th className="py-3 px-4">Objet Affecté</th>
                  <th className="py-3 px-4">Détails & Transitions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {log.actorName}
                      </div>
                      <div className="text-[10px] text-slate-400">{log.actorEmail}</div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {log.actorRoles.map((r) => (
                          <span
                            key={r}
                            className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold text-slate-600 dark:text-slate-300"
                          >
                            {ROLE_DEFINITIONS[r]?.label || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-purple-700 dark:text-purple-300 block">
                        {log.actionLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {log.targetLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
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
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <Building className="w-4 h-4 text-blue-600" />
              Université Sidi Mohamed Ben Abdellah (USMBA Fès)
            </div>
            <p className="text-slate-500 text-xs">
              Établissements partenaires : École Supérieure de Technologie (EST Fès), Faculté des Sciences et Techniques (FST Fès), Faculté des Sciences Dhar El Mahraz (FSDM).
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Laboratoire rattaché actif :
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                · Laboratoire Sciences Ingénierie et Gestion (LSIG)
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <Building className="w-4 h-4 text-indigo-600" />
              Université Mohammed V de Rabat (UM5)
            </div>
            <p className="text-slate-500 text-xs">
              Établissements partenaires : École Mohammadia d’Ingénieurs (EMI Rabat), Faculté des Sciences de Rabat (FSR).
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Laboratoire rattaché actif :
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                · Laboratoire Énergie Propre & Systèmes Intelligents (LEPSI)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Vue Globale */}
      {activeTab === 'vue_globale' && (
        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold">Total Sujets Doctoraux</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {subjects.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Validés et en examen</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold">Candidatures Enregistrées</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {candidates.length}
            </div>
            <div className="text-[11px] text-blue-600 font-medium">
              Suivi cycle de vie actif
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold">Événements d’Audit Enregistrés</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {auditLogs.length}
            </div>
            <div className="text-[11px] text-purple-600 font-medium">
              Traçabilité complète active
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Multi-Role Account */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAccount
                  ? `Modifier les Rôles RBAC : ${editingAccount.fullName}`
                  : 'Créer un Compte & Attribuer des Rôles Multiples'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1.5">
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
                            ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRoleSelection(roleId)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {def.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
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
                  <label className="font-semibold block mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: Pr. Khalid MANSOURI"
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email Google / Académique *</label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingAccount)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@usmba.ac.ma"
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Titre / Fonction</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Université *</label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="Université Sidi Mohamed Ben Abdellah (USMBA Fès)">
                    USMBA Fès
                  </option>
                  <option value="Université Mohammed V de Rabat (UM5)">UM5 Rabat</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Établissement *</label>
                  <input
                    type="text"
                    required
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Laboratoire *</label>
                  <input
                    type="text"
                    required
                    value={lab}
                    onChange={(e) => setLab(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-purple-600 hover:bg-purple-700 font-bold rounded-lg shadow-xs"
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
