import React, { useState } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { getUITranslation } from '../translations';
import {
  Globe,
  Users,
  HelpCircle,
  X,
  Gamepad2,
  Smartphone,
  Check,
  Play,
  Archive,
  Trophy,
  BookOpen,
  Settings as SettingsIcon,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './Avatar';
import { playSound } from '../services/soundService';
import { HERO_ASSETS, ROLE_PORTRAITS } from '../src/design/assetRegistry';
import {
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  NavButton,
  NavDock,
  TacticalButton,
} from './ui/BlacksiteUI';

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
      {/* Top Agency Toolbar */}
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center gap-2 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2 z-30">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            onShowProfile();
          }}
          className="h-11 min-h-[44px] active:scale-[0.98] transition-colors flex items-center gap-2 rounded-[10px] blacksite-panel px-2.5 sm:px-3 hover:border-[#B49A62]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 min-w-0"
        >
          <Avatar
            avatar={avatarSrc}
            name={displayName}
            size={28}
            status={loading ? 'waiting' : 'none'}
          />
          <span className="text-xs sm:text-sm font-bold text-text-main max-w-[92px] sm:max-w-[150px] truncate">
            {displayName}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            onClick={() => {
              playSound('click');
              onShowRules();
            }}
            title={t('howToPlay')}
            aria-label={t('howToPlay')}
            variant="secondary"
          >
            <HelpCircle size={18} className="text-cyan-text" />
          </IconButton>

          <button
            type="button"
            onClick={() => {
              playSound('click');
              setShowLangModal(true);
            }}
            className="h-11 min-h-[44px] rounded-[10px] blacksite-panel hover:border-[#B49A62]/55 px-2.5 sm:px-3 font-bold text-text-main text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75"
          >
            <Globe size={16} className="text-primary-text shrink-0" />
            <span className="font-mono-code text-[11px] text-text-muted">{activeLangObj.code}</span>
            <span className="hidden xs:inline sm:inline">{activeLangObj.label}</span>
          </button>
        </div>
      </header>

      {/* Center Hero Briefing + Launch Action */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-4 z-20 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-xl flex flex-col gap-3.5 sm:gap-4"
        >
          {/* Classified Hero Artwork Frame */}
          <div className="relative w-full aspect-[16/9] max-h-[225px] sm:max-h-[265px] rounded-[16px] overflow-hidden border border-[#B49A62]/35 shadow-[0_20px_52px_rgba(4,7,12,0.58)] bg-[#080B10]">
            <img
              src={HERO_ASSETS.mainBanner}
              alt="Mr. White Classified Intelligence"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/35 to-[#080B10]/45 flex flex-col justify-between p-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <ClassifiedStamp tone="gold">BLACKSITE · OP-02</ClassifiedStamp>
                <ClassifiedStamp tone="cyan">3–20 AGENTS</ClassifiedStamp>
              </div>

              <div className="text-start">
                <h1
                  className={`text-2xl sm:text-4xl font-extrabold text-[#ECEFF4] leading-none drop-shadow-sm ${
                    isRTL ? 'font-cairo' : 'tracking-tight'
                  }`}
                >
                  {isRTL ? 'المتخفي · MR. WHITE' : 'MR. WHITE'}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-[#C9B17B] mt-1.5">
                  {isRTL
                    ? 'المدنيون · المتخفون · العميل المجهول'
                    : 'Civilians · Undercovers · Mr. White'}
                </p>
              </div>
            </div>
          </div>

          {/* Primary Launch Control + Special Roles Briefing Card */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 w-full items-stretch">
            <TacticalButton
              variant="primary"
              size="lg"
              onClick={() => {
                playSound('pop');
                setShowPlayOptions(true);
              }}
              className="sm:col-span-7 min-h-[62px] px-4 sm:px-5 rounded-[12px] justify-between"
            >
              <span className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-10 h-10 rounded-[8px] bg-[#080B10]/15 border border-[#080B10]/20 flex items-center justify-center shrink-0 text-[#080B10]">
                  <Play size={18} className="fill-current rtl:rotate-180" />
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

            <IntelligencePanel className="sm:col-span-5 px-3.5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center -space-x-2 rtl:space-x-reverse shrink-0">
                <img
                  src={ROLE_PORTRAITS.citizen}
                  alt="Civilian"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#668F9A]/55 object-cover relative z-30 shadow-xs"
                />
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Undercover"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#A46F44]/55 object-cover relative z-20 shadow-xs"
                />
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#B49A62]/55 object-cover relative z-10 shadow-xs"
                />
              </div>

              <div className="text-start min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                  <Shield size={13} className="text-primary-text shrink-0" />
                  <span className="truncate">{isRTL ? '8 أدوار خاصة' : '8 Special Roles'}</span>
                </div>
                <p className="text-[11px] text-text-muted tabular-nums truncate mt-0.5">
                  {isRTL ? '3 – 20 عميلاً' : '3 – 20 Operatives'}
                </p>
              </div>
            </IntelligencePanel>
          </div>
        </motion.div>
      </div>

      {/* Unified 5-Tab Bottom Navigation Dock */}
      <nav
        aria-label={isRTL ? 'التنقل الرئيسي' : 'Primary navigation'}
        className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] z-20"
      >
        <NavDock>
          <NavButton
            icon={<Archive size={19} />}
            label={isRTL ? 'المقتنيات' : 'Vault'}
            onClick={() => {
              playSound('click');
              onShowInventory();
            }}
          />
          <NavButton
            icon={<Trophy size={19} />}
            label={isRTL ? 'الترتيب' : 'Ranks'}
            onClick={() => {
              playSound('click');
              onShowScoreboard();
            }}
          />
          <NavButton
            icon={<BookOpen size={19} />}
            label={isRTL ? 'الكلمات' : 'Words'}
            onClick={() => {
              playSound('click');
              onShowDictionary();
            }}
          />
          <NavButton
            icon={<Users size={19} />}
            label={isRTL ? 'العملاء' : 'Players'}
            onClick={() => {
              playSound('click');
              onManagePlayers();
            }}
          />
          <NavButton
            icon={<SettingsIcon size={19} />}
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
                  <div className="w-12 h-12 rounded-[10px] bg-[#668F9A]/15 border border-[#668F9A]/40 flex items-center justify-center text-cyan-text shrink-0">
                    <div className="relative">
                      <Globe size={24} />
                      <Gamepad2 size={13} className="absolute -bottom-1 -right-1 text-primary-text" />
                    </div>
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
                  <div className="w-12 h-12 rounded-[10px] bg-[#B49A62]/15 border border-[#B49A62]/40 flex items-center justify-center text-primary-text shrink-0">
                    <div className="relative">
                      <Smartphone size={24} />
                      <Users size={13} className="absolute -bottom-1 -right-1 text-cyan-text" />
                    </div>
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
