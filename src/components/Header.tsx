import React from 'react';
import {
  Sun,
  Moon,
  LogIn,
  LogOut,
  FileCheck2,
  BookOpen,
  Send,
  Award,
  Calendar,
  Bell,
  Shield,
  History
} from 'lucide-react';
import { GcdSection, UserProfile, Candidate } from '../domain/types';
import { canAccessSection, ROLE_DEFINITIONS } from '../domain/rbac';

interface HeaderProps {
  activeSection: GcdSection;
  onSelectSection: (section: GcdSection) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuthModal: () => void;
  currentUser: UserProfile | null;
  onLogout?: () => void;
  candidate?: Candidate;
  unreadNotificationsCount?: number;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

interface NavItemConfig {
  section: GcdSection;
  label: string;
  mobileLabel: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    section: 'catalogue',
    label: 'Catalogue Sujets',
    mobileLabel: 'Catalogue'
  },
  {
    section: 'calendrier',
    label: 'Calendrier',
    mobileLabel: 'Calendrier',
    icon: Calendar
  },
  {
    section: 'mon_dossier',
    label: 'Mon Dossier',
    mobileLabel: 'Dossier',
    icon: FileCheck2
  },
  {
    section: 'reinscription',
    label: 'Réinscription',
    mobileLabel: 'Réinscription',
    icon: Award
  },
  {
    section: 'candidatures_encadrant',
    label: 'Candidatures',
    mobileLabel: 'Candidatures',
    icon: BookOpen
  },
  {
    section: 'mes_sujets',
    label: 'Mes Sujets',
    mobileLabel: 'Sujets'
  },
  {
    section: 'pv_entretiens',
    label: 'PV Entretiens',
    mobileLabel: 'PV'
  },
  {
    section: 'relances_encadrant',
    label: 'Relances',
    mobileLabel: 'Relances',
    icon: Send
  },
  {
    section: 'validation_pv',
    label: 'Visa PV',
    mobileLabel: 'Visa PV',
    icon: FileCheck2
  },
  {
    section: 'validation_sujets',
    label: 'Validation Sujets',
    mobileLabel: 'Val. Sujets'
  },
  {
    section: 'validation_rapports',
    label: 'Validation Rapports',
    mobileLabel: 'Rapports'
  },
  {
    section: 'profils_candidats',
    label: 'Profils Candidats',
    mobileLabel: 'Profils'
  },
  {
    section: 'gestion_comptes',
    label: 'Comptes & RBAC',
    mobileLabel: 'Comptes',
    icon: Shield
  },
  {
    section: 'audit_logs',
    label: 'Journal d’Audit',
    mobileLabel: 'Audit',
    icon: History
  },
  {
    section: 'universites_structures',
    label: 'Universités & Labos',
    mobileLabel: 'Labos'
  }
];

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onSelectSection,
  isDarkMode,
  onToggleDarkMode,
  onOpenAuthModal,
  currentUser,
  onLogout,
  unreadNotificationsCount = 0,
  isPreviewMode = false,
  onExitPreview
}) => {
  const authorizedNavItems = NAV_ITEMS.filter((item) =>
    canAccessSection(currentUser, item.section)
  );

  const primaryRole = currentUser?.roles?.[0] || 'candidat';
  const primaryRoleDef = ROLE_DEFINITIONS[primaryRole];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Zone 1: Clean Single-Line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectSection('catalogue')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group text-left whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs tracking-tight transition-transform group-hover:scale-105">
              GCD
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0">
              Cycle Doctoral
            </span>
          </button>

          {/* Zone 2: Clean Typographic Navigation */}
          <nav className="hidden md:flex items-center gap-5 overflow-x-auto no-scrollbar h-full">
            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => onSelectSection(item.section)}
                  className={`h-full px-1 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    isActive
                      ? 'border-emerald-700 dark:border-emerald-400 text-emerald-800 dark:text-emerald-300'
                      : 'border-transparent text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && canAccessSection(currentUser, 'notifications') && (
              <button
                type="button"
                onClick={() => onSelectSection('notifications')}
                title="Centre de Notifications"
                className={`relative p-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === 'notifications'
                    ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Activer mode clair' : 'Activer mode sombre'}
              className="p-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors shrink-0"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-2.5 border-l border-stone-200 dark:border-stone-800 shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full ring-2 ring-emerald-700/20 object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0"
                    title={currentUser.fullName}
                  >
                    {currentUser.fullName.charAt(0)}
                  </div>
                )}

                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block truncate max-w-[140px]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block whitespace-nowrap">
                    {primaryRoleDef.label}
                    {currentUser.roles.length > 1 ? ` · +${currentUser.roles.length - 1}` : ''}
                  </span>
                </div>

                {isPreviewMode && onExitPreview ? (
                  <button
                    type="button"
                    onClick={onExitPreview}
                    title="Quitter l’aperçu temporaire"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors whitespace-nowrap shrink-0"
                  >
                    Quitter aperçu
                  </button>
                ) : (
                  onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      title="Se déconnecter"
                      className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-95 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-3 overflow-x-auto py-2 border-t border-stone-100 dark:border-stone-800 text-xs no-scrollbar">
          {authorizedNavItems.map((item) => (
            <button
              key={item.section}
              type="button"
              onClick={() => onSelectSection(item.section)}
              className={`px-2 py-1 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeSection === item.section
                  ? 'border-emerald-700 dark:border-emerald-400 text-emerald-800 dark:text-emerald-300'
                  : 'border-transparent text-stone-600 dark:text-stone-300'
              }`}
            >
              {item.mobileLabel}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
