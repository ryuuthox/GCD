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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Bell className="w-4 h-4" />
            <span>Centre de Notifications & Alertes Réglementaires</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Vos Notifications ({scoped.length})
          </h1>
          <p className="text-xs text-slate-500">
            Suivez les notifications informatives et traitez en priorité les actions requises sur vos dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold">
            {actionRequiredCount} action(s) requise(s)
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold">
            {unreadCount} non lue(s)
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Toutes ({scoped.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('action_required')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 ${
              categoryFilter === 'action_required'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Actions Requises</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('informational')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 ${
              categoryFilter === 'informational'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Informatives</span>
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | NotificationStatus)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-400">
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
                    ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                    : isAction
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : isUnread
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        isAction
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        Nouveau
                      </span>
                    )}
                    {isResolved && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Résolue
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {notif.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {notif.content}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {notif.status === 'unread' && (
                      <button
                        type="button"
                        onClick={() => onUpdateNotificationStatus(notif, 'read')}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Marquer comme lu
                      </button>
                    )}

                    {notif.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => onUpdateNotificationStatus(notif, 'resolved')}
                        className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-semibold flex items-center gap-1"
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
                        className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 shadow-xs"
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
