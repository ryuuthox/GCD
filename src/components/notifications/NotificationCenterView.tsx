import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
  Filter
} from 'lucide-react';
import {
  GcdSection,
  NotificationCategory,
  NotificationItem,
  NotificationStatus,
  UserProfile
} from '../../domain/types';
import { canAccessSection } from '../../domain/rbac';

interface NotificationCenterViewProps {
  notifications: NotificationItem[];
  currentUser: UserProfile;
  onUpdateNotificationStatus: (notif: NotificationItem, status: NotificationStatus) => void;
  onNavigateSection: (section: GcdSection) => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  notifications,
  currentUser,
  onUpdateNotificationStatus,
  onNavigateSection
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NotificationStatus>('all');

  const userEmail = currentUser.email.trim().toLowerCase();

  // Strictly scope notifications to this user (UID, personal email, or broadcast to their active role)
  const scoped = notifications.filter((n) => {
    const matchEmail = n.recipientEmail && n.recipientEmail.toLowerCase() === userEmail;
    const matchUid = n.recipientUid && n.recipientUid === currentUser.uid;
    const matchRole =
      n.recipientRole &&
      currentUser.roles.includes(n.recipientRole) &&
      !n.recipientEmail &&
      !n.recipientUid;
    return Boolean(matchEmail || matchUid || matchRole);
  });

  const filtered = scoped
    .filter((n) => (categoryFilter === 'all' ? true : n.category === categoryFilter))
    .filter((n) => (statusFilter === 'all' ? true : n.status === statusFilter))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = scoped.filter((n) => n.status === 'unread').length;
  const actionRequiredCount = scoped.filter(
    (n) => n.category === 'action_required' && n.status !== 'resolved'
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Bell className="w-4 h-4" />
            <span>Centre de Notifications & Alertes Réglementaires</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5 tabular-nums">
            Vos Notifications ({scoped.length})
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Suivez les notifications informatives et traitez en priorité les actions requises sur vos dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold tabular-nums">
            {actionRequiredCount} action(s) requise(s)
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold tabular-nums">
            {unreadCount} non lue(s)
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-stone-400 mr-1" />
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold tabular-nums transition-colors ${
              categoryFilter === 'all'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Toutes ({scoped.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('action_required')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-colors ${
              categoryFilter === 'action_required'
                ? 'bg-amber-700 text-white dark:bg-amber-600'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Actions Requises</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('informational')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition-colors ${
              categoryFilter === 'informational'
                ? 'bg-teal-700 text-white dark:bg-teal-600'
                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-950/60'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Informatives</span>
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | NotificationStatus)}
          className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">Tous les statuts</option>
          <option value="unread">Non lues</option>
          <option value="read">Lues</option>
          <option value="resolved">Traitées / Résolues</option>
        </select>
      </div>

      {/* Notification Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-10 text-center text-xs text-stone-500 dark:text-stone-400">
            Aucune notification ne correspond aux critères sélectionnés.
          </div>
        ) : (
          filtered.map((notif) => {
            const isAction = notif.category === 'action_required';
            const isUnread = notif.status === 'unread';
            const isResolved = notif.status === 'resolved';

            return (
              <div
                key={notif.id}
                className={`rounded-2xl border p-4 transition-all text-xs space-y-2.5 ${
                  isResolved
                    ? 'bg-stone-50/70 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 opacity-75'
                    : isAction
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : isUnread
                    ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                        isAction
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-200'
                      }`}
                    >
                      {isAction ? (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Action Requise
                        </>
                      ) : (
                        <>
                          <Info className="w-3 h-3" /> Informative
                        </>
                      )}
                    </span>

                    {isUnread && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-700 dark:bg-emerald-600 text-white text-[10px] font-bold">
                        Nouveau
                      </span>
                    )}
                    {isResolved && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Résolue
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {notif.title}
                  </h3>
                  <p className="text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                    {notif.content}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    {notif.status === 'unread' && (
                      <button
                        type="button"
                        onClick={() => onUpdateNotificationStatus(notif, 'read')}
                        className="px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Marquer comme lu
                      </button>
                    )}

                    {notif.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => onUpdateNotificationStatus(notif, 'resolved')}
                        className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Marquer résolu
                      </button>
                    )}

                    {notif.targetSection && canAccessSection(currentUser, notif.targetSection) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (notif.status === 'unread') {
                            onUpdateNotificationStatus(notif, 'read');
                          }
                          onNavigateSection(notif.targetSection!);
                        }}
                        className="px-3.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <span>{notif.actionLabel || 'Ouvrir'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
