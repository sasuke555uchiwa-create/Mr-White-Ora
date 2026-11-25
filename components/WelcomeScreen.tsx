import React, { useState } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { getUITranslation } from '../translations';
import {
  Globe,
  X,
  Check,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './Avatar';
import { playSound } from '../services/soundService';
import {
  BLACKSITE_NAV_ICONS,
  BLACKSITE_TEXTURES,
  BlacksiteNavKey,
  HERO_ASSETS,
  ROLE_PORTRAITS,
} from '../src/design/assetRegistry';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  NavButton,
  NavDock,
  TacticalButton,
  TacticalToolbar,
} from './ui/BlacksiteUI';

const NavDockCustomIcon: React.FC<{ navKey: BlacksiteNavKey }> = ({ navKey }) => {
  const pair = BLACKSITE_NAV_ICONS[navKey];
  return (
    <span className="relative inline-flex w-6 h-6 items-center justify-center">
      <img
        src={pair.inactive}
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        referrerPolicy="no-referrer"
        className="w-[22px] h-[22px] object-contain transition-opacity duration-150 group-hover:opacity-0"
      />
      <img
        src={pair.active}
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        referrerPolicy="no-referrer"
        className="w-[22px] h-[22px] object-contain absolute inset-0 m-auto opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />
    </span>
  );
};

interface WelcomeScreenProps {
  onStart: () => void;
  onShowScoreboard: () => void;
  onManagePlayers: () => void;
  onOpenSettings: () => void;
  onShowRules: () => void;
  onShowProfile: () => void;
  onShowOnline: () => void;
  onShowDictionary: () => void;
  onShowInventory: () => void;
  onLanguageChange?: (lang: string) => void;
  currentTheme: 'dark' | 'gray' | 'light' | 'system';
}

const QUICK_LANGUAGES = [
  { id: 'ar', label: 'العربية', code: 'AR' },
  { id: 'en', label: 'English', code: 'EN' },
  { id: 'fr', label: 'Français', code: 'FR' },
  { id: 'es', label: 'Español', code: 'ES' },
  { id: 'de', label: 'Deutsch', code: 'DE' },
  { id: 'tr', label: 'Türkçe', code: 'TR' },
  { id: 'pt', label: 'Português', code: 'PT' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStart,
  onShowScoreboard,
  onManagePlayers,
  onOpenSettings,
  onShowRules,
  onShowProfile,
  onShowOnline,
  onShowDictionary,
  onShowInventory,
  onLanguageChange,
}) => {
  const settings = getSettings();
  const { user, profile, loading } = useAuth();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const avatarSrc = profile
    ? profile.photoURL || ''
    : user
    ? user.photoURL || ''
    : settings.avatar || '';

  const displayName =
    profile?.displayName || user?.displayName || (isRTL ? 'العميل' : 'Operative');
  const activeLangObj = QUICK_LANGUAGES.find((l) => l.id === lang) || QUICK_LANGUAGES[0];

  const handleSelectLanguage = (newLang: string) => {
    const updated = { ...settings, language: newLang as any };
    saveSettings(updated);
    playSound('click');
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
    setShowLangModal(false);
  };

  return (
    <div className="flex flex-col min-h-full w-full relative overflow-x-hidden justify-between select-none">
      <BlacksiteScreenBackdrop bgKey="home" priority texture="carbon" />

      {/* Top Agency Toolbar */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center gap-2.5 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2 z-30 relative">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            onShowProfile();
          }}
          className="h-11 min-h-[44px] active:scale-[0.98] transition-colors flex items-center gap-2.5 rounded-[12px] blacksite-panel px-2.5 sm:px-3.5 hover:border-[#B49A62]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 min-w-0"
        >
          <Avatar
            avatar={avatarSrc}
            name={displayName}
            size={30}
            status={loading ? 'waiting' : 'none'}
          />
          <div className="text-start min-w-0">
            <span className="block text-xs sm:text-sm font-bold text-text-main max-w-[110px] sm:max-w-[170px] truncate leading-tight">
              {displayName}
            </span>
            <span className="hidden sm:block text-[10.5px] font-medium text-text-muted leading-tight truncate">
              {isRTL ? 'ملف العميل' : 'Operative Dossier'}
            </span>
          </div>
        </button>

        <TacticalToolbar>
          <IconButton
            onClick={() => {
              playSound('click');
              onShowRules();
            }}
            title={t('howToPlay')}
            aria-label={t('howToPlay')}
            variant="ghost"
            size="sm"
          >
            <BlacksiteIcon name="help" size={19} />
          </IconButton>

          <div aria-hidden="true" className="w-px h-6 bg-border-strong" />

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setShowLangModal(true);
            }}
            className="h-11 min-h-[44px] rounded-[9px] hover:bg-bg-card px-2.5 sm:px-3 font-bold text-text-main text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75"
          >
            <Globe size={16} className="text-primary-text shrink-0" />
            <span className="font-mono-code text-[11px] text-text-muted">{activeLangObj.code}</span>
            <span className="hidden sm:inline">{activeLangObj.label}</span>
          </button>
        </TacticalToolbar>
      </header>

      {/* Flagship Agency Showcase + Launch Command Center */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-5 z-20 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch"
        >
          {/* Classified Hero Artwork Frame */}
          <div className="lg:col-span-7 relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[360px] rounded-[16px] overflow-hidden border border-[#B49A62]/40 shadow-[0_22px_56px_rgba(4,7,12,0.62)] bg-[#080B10]">
            <img
              src={HERO_ASSETS.mainBanner}
              alt="Mr. White Classified Intelligence"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/35 to-[#080B10]/55 flex flex-col justify-between p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <ClassifiedStamp tone="gold">BLACKSITE · OP-02</ClassifiedStamp>
                <ClassifiedStamp tone="cyan">3–20 AGENTS</ClassifiedStamp>
              </div>

              <div className="text-start max-w-lg">
                <p className="text-[11px] font-mono-code font-semibold tracking-wider text-primary-text/90 mb-1">
                  {isRTL ? 'ملف الاستنتاج الاجتماعي السري' : 'CLASSIFIED SOCIAL DEDUCTION'}
                </p>
                <h1
                  className={`text-2xl sm:text-4xl lg:text-[42px] font-extrabold text-[#ECEFF4] leading-none drop-shadow-sm text-balance ${
                    isRTL ? 'font-cairo' : 'tracking-tight'
                  }`}
                >
                  {isRTL ? 'المتخفي · MR. WHITE' : 'MR. WHITE'}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-[#C9B17B] mt-2 leading-relaxed">
                  {isRTL
                    ? 'المدنيون · المتخفون · العميل المجهول'
                    : 'Civilians · Undercovers · Mr. White'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Command Console + Faction Dossier */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3.5 sm:gap-4">
            {/* Operation Launch Console */}
            <IntelligencePanel className="relative overflow-hidden blacksite-dossier-surface blacksite-texture-carbon p-4 sm:p-5 border-[#B49A62]/35 flex flex-col gap-3.5">
              <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
              <img
                src={BLACKSITE_TEXTURES.dossierOrnament}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="pointer-events-none select-none absolute inset-x-3 top-2 w-[calc(100%-1.5rem)] h-6 object-fill opacity-40"
              />

              <div className="relative flex items-center justify-between gap-2 text-start">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary-text">
                    {isRTL ? 'مركز العمليات الميدانية' : 'Operation Command'}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {isRTL
                      ? 'تحقيق مباشر على الطاولة أو عبر الشبكة'
                      : 'Tabletop pass & play or encrypted online rooms'}
                  </p>
                </div>
                <ClassifiedStamp tone="gold">READY</ClassifiedStamp>
              </div>

              <TacticalButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  playSound('pop');
                  setShowPlayOptions(true);
                }}
                className="min-h-[64px] px-4 sm:px-5 rounded-[12px] justify-between"
              >
                <span className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-10 h-10 rounded-[8px] bg-[#080B10]/16 border border-[#080B10]/25 flex items-center justify-center shrink-0">
                    <BlacksiteIcon name="playOperation" size={20} tone="ink" rtlFlip />
                  </span>
                  <span className="text-start min-w-0">
                    <span className="block text-base sm:text-lg font-extrabold leading-tight truncate">
                      {isRTL ? 'ابدأ اللعب' : t('play')}
                    </span>
                    <span className="block text-[11px] font-semibold opacity-80 leading-tight truncate">
                      {isRTL ? 'أونلاين أو نفس الهاتف' : 'Online or Pass & Play'}
                    </span>
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 rtl:rotate-180 opacity-85" />
              </TacticalButton>

              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/70 text-xs">
                <div className="flex items-center gap-2 text-text-muted min-w-0">
                  <BlacksiteIcon name="onlineMultiplayer" size={15} />
                  <span className="truncate font-semibold">
                    {isRTL ? 'غرف أونلاين' : 'Online Rooms'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-muted min-w-0">
                  <BlacksiteIcon name="passAndPlay" size={15} />
                  <span className="truncate font-semibold">
                    {isRTL ? 'نفس الجهاز' : 'Shared Device'}
                  </span>
                </div>
              </div>
            </IntelligencePanel>

            {/* Core Factions & Special Roles Dossier */}
            <IntelligencePanel className="p-4 flex flex-col justify-between gap-3 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-main min-w-0">
                  <Shield size={14} className="text-primary-text shrink-0" />
                  <span className="truncate">{isRTL ? '8 أدوار خاصة' : '8 Special Roles'}</span>
                </div>
                <span className="text-[11px] font-semibold text-text-muted tabular-nums shrink-0">
                  {isRTL ? '3 – 20 عميلاً' : '3 – 20 Operatives'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[10px] bg-bg-card border border-[#668F9A]/35 p-2 flex flex-col items-center text-center gap-1.5">
                  <img
                    src={ROLE_PORTRAITS.citizen}
                    alt="Civilian"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-[8px] bg-[#0D1219] object-cover border border-[#668F9A]/45"
                  />
                  <span className="text-[11px] font-bold text-cyan-text truncate max-w-full">
                    {isRTL ? 'مدني' : 'Civilian'}
                  </span>
                </div>

                <div className="rounded-[10px] bg-bg-card border border-[#A46F44]/35 p-2 flex flex-col items-center text-center gap-1.5">
                  <img
                    src={ROLE_PORTRAITS.undercover}
                    alt="Undercover"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-[8px] bg-[#0D1219] object-cover border border-[#A46F44]/45"
                  />
                  <span className="text-[11px] font-bold text-text-main truncate max-w-full">
                    {isRTL ? 'متخفٍ' : 'Undercover'}
                  </span>
                </div>

                <div className="rounded-[10px] bg-bg-card border border-[#B49A62]/40 p-2 flex flex-col items-center text-center gap-1.5">
                  <img
                    src={ROLE_PORTRAITS.mrwhite}
                    alt="Mr. White"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-[8px] bg-[#0D1219] object-cover border border-[#B49A62]/50"
                  />
                  <span className="text-[11px] font-bold text-primary-text truncate max-w-full">
                    {isRTL ? 'مستر وايت' : 'Mr. White'}
                  </span>
                </div>
              </div>
            </IntelligencePanel>
          </div>
        </motion.div>
      </div>

      {/* Unified 5-Tab Bottom Navigation Dock */}
      <nav
        aria-label={isRTL ? 'التنقل الرئيسي' : 'Primary navigation'}
        className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] z-20 relative"
      >
        <NavDock>
          <NavButton
            icon={<NavDockCustomIcon navKey="vault" />}
            label={isRTL ? 'المقتنيات' : 'Vault'}
            onClick={() => {
              playSound('click');
              onShowInventory();
            }}
          />
          <NavButton
            icon={<NavDockCustomIcon navKey="rankings" />}
            label={isRTL ? 'الترتيب' : 'Ranks'}
            onClick={() => {
              playSound('click');
              onShowScoreboard();
            }}
          />
          <NavButton
            icon={<NavDockCustomIcon navKey="dictionary" />}
            label={isRTL ? 'الكلمات' : 'Words'}
            onClick={() => {
              playSound('click');
              onShowDictionary();
            }}
          />
          <NavButton
            icon={<NavDockCustomIcon navKey="agents" />}
            label={isRTL ? 'العملاء' : 'Players'}
            onClick={() => {
              playSound('click');
              onManagePlayers();
            }}
          />
          <NavButton
            icon={<NavDockCustomIcon navKey="settings" />}
            label={isRTL ? 'الإعدادات' : 'Settings'}
            onClick={() => {
              playSound('click');
              onOpenSettings();
            }}
          />
        </NavDock>
      </nav>

      {/* Play Mode Selection Modal */}
      <AnimatePresence>
        {showPlayOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlayOptions(false)}
            className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <ModalShell
                maxWidthClass="max-w-md"
                onClose={() => setShowPlayOptions(false)}
                ariaLabel={isRTL ? 'اختر وضع التشغيل' : 'Select Operation Mode'}
                className="p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-text-main">
                      {isRTL ? 'اختر وضع التشغيل' : 'Select Operation Mode'}
                    </h2>
                    <p className="text-xs text-text-muted">
                      {isRTL ? 'حدد نمط المواجهة الميدانية' : 'Choose how operatives connect'}
                    </p>
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPlayOptions(false)}
                    aria-label={t('close')}
                  >
                    <X size={18} />
                  </IconButton>
                </div>

                {/* Online Operations */}
                <InteractiveCard
                  accent="cyan"
                  onClick={() => {
                    playSound('click');
                    setShowPlayOptions(false);
                    onShowOnline();
                  }}
                  className="w-full text-start border-[#668F9A]/45 hover:border-[#668F9A] p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-text-main">
                        {isRTL ? 'عمليات أونلاين' : t('playOnline')}
                      </span>
                      <ClassifiedStamp tone="cyan">NET</ClassifiedStamp>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {isRTL
                        ? 'العب عبر الإنترنت في غرف عامة أو خاصة مشفّرة مع أصدقائك.'
                        : 'Join public or private encrypted rooms over the network.'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-[10px] bg-[#668F9A]/15 border border-[#668F9A]/40 flex items-center justify-center shrink-0">
                    <BlacksiteIcon name="onlineMultiplayer" size={24} />
                  </div>
                </InteractiveCard>

                {/* Local Pass & Play */}
                <InteractiveCard
                  accent="gold"
                  onClick={() => {
                    playSound('click');
                    setShowPlayOptions(false);
                    onStart();
                  }}
                  className="w-full text-start border-[#B49A62]/45 hover:border-[#B49A62] p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-text-main">
                        {isRTL ? 'لعب على نفس الهاتف' : t('playOffline')}
                      </span>
                      <ClassifiedStamp tone="gold">LOCAL</ClassifiedStamp>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {isRTL
                        ? 'مرر الجهاز بين العملاء الجالسين في نفس الغرفة.'
                        : 'Pass & play on one shared briefing device in the same room.'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-[10px] bg-[#B49A62]/15 border border-[#B49A62]/40 flex items-center justify-center shrink-0">
                    <BlacksiteIcon name="passAndPlay" size={24} />
                  </div>
                </InteractiveCard>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Language Picker Modal */}
      <AnimatePresence>
        {showLangModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLangModal(false)}
            className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                onClose={() => setShowLangModal(false)}
                ariaLabel={t('language')}
                className="p-5"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <h3 className="text-base font-extrabold text-text-main flex items-center gap-2">
                    <Globe size={18} className="text-primary-text" />
                    <span>{t('language')}</span>
                  </h3>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLangModal(false)}
                    aria-label={t('close')}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LANGUAGES.map((l) => {
                    const isSelected = l.id === lang;
                    return (
                      <InteractiveCard
                        key={l.id}
                        selected={isSelected}
                        accent="gold"
                        onClick={() => handleSelectLanguage(l.id)}
                        className="p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono-code text-[11px] font-semibold px-1.5 py-0.5 rounded-[6px] bg-bg-dark/40 text-primary-text shrink-0">
                            {l.code}
                          </span>
                          <span className="text-xs sm:text-sm font-bold truncate">{l.label}</span>
                        </div>
                        {isSelected && <Check size={15} className="text-primary-text shrink-0" />}
                      </InteractiveCard>
                    );
                  })}
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
