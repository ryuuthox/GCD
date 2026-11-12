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
  activeClass: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    section: 'catalogue',
    label: 'Catalogue Sujets',
    mobileLabel: 'Catalogue',
    activeClass: 'bg-blue-600 text-white shadow-xs'
  },
  {
    section: 'calendrier',
    label: 'Calendrier',
    mobileLabel: 'Calendrier',
    icon: Calendar,
    activeClass: 'bg-blue-600 text-white shadow-xs'
  },
  {
    section: 'mon_dossier',
    label: 'Mon Dossier',
    mobileLabel: 'Dossier',
    icon: FileCheck2,
    activeClass: 'bg-blue-600 text-white shadow-xs'
  },
  {
    section: 'reinscription',
    label: 'Réinscription & Rapport',
    mobileLabel: 'Réinscription',
    icon: Award,
    activeClass: 'bg-blue-600 text-white shadow-xs'
  },
  {
    section: 'candidatures_encadrant',
    label: 'Candidatures & Aperçu',
    mobileLabel: 'Candidatures',
    icon: BookOpen,
    activeClass: 'bg-indigo-600 text-white shadow-xs'
  },
  {
    section: 'mes_sujets',
    label: 'Mes Sujets',
    mobileLabel: 'Sujets',
    activeClass: 'bg-indigo-600 text-white shadow-xs'
  },
  {
    section: 'pv_entretiens',
    label: 'PV Entretiens',
    mobileLabel: 'PV',
    activeClass: 'bg-indigo-600 text-white shadow-xs'
  },
  {
    section: 'relances_encadrant',
    label: 'Relances',
    mobileLabel: 'Relances',
    icon: Send,
    activeClass: 'bg-indigo-600 text-white shadow-xs'
  },
  {
    section: 'validation_pv',
    label: 'Visa PV',
    mobileLabel: 'Visa PV',
    icon: FileCheck2,
    activeClass: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    section: 'validation_sujets',
    label: 'Validation Sujets',
    mobileLabel: 'Val. Sujets',
    activeClass: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    section: 'validation_rapports',
    label: 'Validation Rapports',
    mobileLabel: 'Rapports',
    activeClass: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    section: 'profils_candidats',
    label: 'Profils Candidats',
    mobileLabel: 'Profils',
    activeClass: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    section: 'gestion_comptes',
    label: 'Comptes & RBAC',
    mobileLabel: 'Comptes',
    icon: Shield,
    activeClass: 'bg-purple-600 text-white shadow-xs'
  },
  {
    section: 'audit_logs',
    label: 'Journal d’Audit',
    mobileLabel: 'Audit',
    icon: History,
    activeClass: 'bg-purple-600 text-white shadow-xs'
  },
  {
    section: 'universites_structures',
    label: 'Universités & Labos',
    mobileLabel: 'Labos',
    activeClass: 'bg-purple-600 text-white shadow-xs'
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
  candidate,
  unreadNotificationsCount = 0,
  isPreviewMode = false,
  onExitPreview
}) => {
  // Dynamically compute authorized navigation tabs purely from domain privileges
  const authorizedNavItems = NAV_ITEMS.filter((item) =>
    canAccessSection(currentUser, item.section)
  );

  const primaryRole = currentUser?.roles?.[0] || 'candidat';
  const primaryRoleDef = ROLE_DEFINITIONS[primaryRole];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectSection('catalogue')}
            className="flex items-center gap-3 shrink-0 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-800 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              GCD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  Cycle Doctoral
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  USMBA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Plateforme Nationale · Gestion Doctorale
              </p>
            </div>
          </div>

          {/* Privilege-driven Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => onSelectSection(item.section)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    isActive
                      ? item.activeClass
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{item.label}</span>
                  {item.section === 'mon_dossier' && candidate?.otpSigned && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Notification Bell (when authenticated and permitted) */}
            {currentUser && canAccessSection(currentUser, 'notifications') && (
              <button
                type="button"
                onClick={() => onSelectSection('notifications')}
                title="Centre de Notifications"
                className={`relative p-2 rounded-xl transition-colors ${
                  activeSection === 'notifications'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Activer mode clair' : 'Activer mode sombre'}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full ring-2 ring-blue-600/20 object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-600/20 shrink-0"
                    title={currentUser.fullName}
                  >
                    {currentUser.fullName.charAt(0)}
                  </div>
                )}

                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[135px]">
                    {currentUser.fullName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${primaryRoleDef.badgeColor}`}
                    >
                      {primaryRoleDef.label}
                    </span>
                    {currentUser.roles.length > 1 && (
                      <span
                        className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300"
                        title={currentUser.roles.map((r) => ROLE_DEFINITIONS[r].label).join(', ')}
                      >
                        +{currentUser.roles.length - 1}
                      </span>
                    )}
                  </div>
                </div>

                {isPreviewMode && onExitPreview ? (
                  <button
                    type="button"
                    onClick={onExitPreview}
                    title="Quitter l’aperçu temporaire"
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors ml-1"
                  >
                    Quitter aperçu
                  </button>
                ) : (
                  onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      title="Se déconnecter"
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            )}
          </div>
        </div>

        {/* Privilege-driven Mobile Navigation */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {authorizedNavItems.map((item) => (
            <button
              key={item.section}
              type="button"
              onClick={() => onSelectSection(item.section)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activeSection === item.section
                  ? item.activeClass
                  : 'text-slate-600 dark:text-slate-300'
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
