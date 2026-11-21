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
  ModalShell,
  NavButton,
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
    <div className="flex flex-col min-h-full w-full relative overflow-hidden justify-between select-none">
      {/* Top Agency Header */}
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center px-4 sm:px-6 pt-4 pb-2 z-30">
        <button
          onClick={() => {
            playSound('click');
            onShowProfile();
          }}
          className="active:scale-[0.98] transition-colors flex items-center gap-2.5 rounded-[12px] bg-bg-surface/90 border border-border-strong px-2.5 py-1.5 hover:border-[#B49A62]/50 min-h-[44px]"
        >
          <Avatar
            avatar={avatarSrc}
            name={displayName}
            size={36}
            status={loading ? 'waiting' : 'none'}
          />
          <div className="text-start hidden sm:block min-w-0">
            <span className="text-xs font-bold text-text-main max-w-[120px] truncate block">
              {displayName}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => {
              playSound('click');
              onShowRules();
            }}
            title={t('howToPlay')}
            aria-label={t('howToPlay')}
            variant="secondary"
          >
            <HelpCircle size={19} className="text-cyan-text" />
          </IconButton>

          <button
            onClick={() => {
              playSound('click');
              setShowLangModal(true);
            }}
            className="min-h-[44px] rounded-[10px] bg-bg-surface border border-border-strong hover:border-[#B49A62]/50 px-3 py-2 font-bold text-text-main text-xs sm:text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Globe size={16} className="text-primary-text" />
            <span className="font-mono-code text-[11px] text-text-muted">{activeLangObj.code}</span>
            <span>{activeLangObj.label}</span>
          </button>
        </div>
      </header>

      {/* Center Hero Briefing + Launch Action */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-3 z-20 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-xl flex flex-col items-center text-center"
        >
          {/* Classified Hero Artwork Frame */}
          <div className="relative w-full aspect-[16/9] max-h-[245px] sm:max-h-[275px] rounded-[16px] overflow-hidden border border-[#B49A62]/35 shadow-[0_20px_52px_rgba(4,7,12,0.58)] mb-5 bg-[#080B10]">
            <img
              src={HERO_ASSETS.mainBanner}
              alt="Mr. White Classified Intelligence"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/45 to-transparent flex flex-col justify-between p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <ClassifiedStamp tone="gold">BLACKSITE · OP-02</ClassifiedStamp>
                <ClassifiedStamp tone="cyan">3–20 AGENTS</ClassifiedStamp>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="text-start">
                  <h1
                    className={`text-2xl sm:text-4xl font-extrabold text-[#ECEFF4] leading-none ${
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
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] overflow-hidden border border-[#B49A62]/45 bg-[#0D1219] shrink-0 shadow-lg">
                  <img
                    src={ROLE_PORTRAITS.undercover}
                    alt="Undercover Operative"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Primary Launch Control + Compact Role Lineup */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full">
            <TacticalButton
              variant="primary"
              size="lg"
              onClick={() => {
                playSound('pop');
                setShowPlayOptions(true);
              }}
              className="flex-1 sm:max-w-[280px] min-h-[58px] px-5 justify-between"
            >
              <span className="flex items-center gap-3 min-w-0">
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] object-cover border border-[#080B10]/30 shrink-0 bg-[#080B10]"
                />
                <span className="text-start min-w-0">
                  <span className="block text-base sm:text-lg font-extrabold leading-tight">
                    {isRTL ? 'ابدأ اللعب' : t('play')}
                  </span>
                  <span className="block text-[11px] font-semibold opacity-80 leading-tight">
                    {isRTL ? 'أونلاين أو نفس الهاتف' : 'Online or Pass & Play'}
                  </span>
                </span>
              </span>
              <Play size={18} className="fill-current shrink-0 rtl:rotate-180" />
            </TacticalButton>

            <IntelligencePanel className="px-4 py-2.5 flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-1.5">
                <img
                  src={ROLE_PORTRAITS.citizen}
                  alt="Civilian"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#668F9A]/50 object-cover"
                />
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Undercover"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#A46F44]/50 object-cover"
                />
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-[8px] bg-[#0D1219] border border-[#B49A62]/50 object-cover"
                />
              </div>
              <div className="text-start">
                <p className="text-xs font-bold text-text-main whitespace-nowrap">
                  {isRTL ? '8 أدوار خاصة' : '8 Special Roles'}
                </p>
                <p className="text-[11px] text-text-muted whitespace-nowrap tabular-nums">
                  {isRTL ? '3 – 20 عميلاً' : '3 – 20 Operatives'}
                </p>
              </div>
            </IntelligencePanel>
          </div>
        </motion.div>
      </div>

      {/* Bottom 5-Item Tactical Navigation Dock */}
      <nav className="w-full max-w-2xl mx-auto px-4 pb-4 pt-2 z-20">
        <IntelligencePanel className="p-2 grid grid-cols-5 gap-1.5">
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
        </IntelligencePanel>
      </nav>

      {/* Play Mode Selection Modal */}
      <AnimatePresence>
        {showPlayOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlayOptions(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <ModalShell maxWidthClass="max-w-md" className="p-5 space-y-3.5">
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
                <button
                  onClick={() => {
                    playSound('click');
                    setShowPlayOptions(false);
                    onShowOnline();
                  }}
                  className="w-full text-start rounded-[12px] bg-bg-card hover:bg-bg-card/80 border border-[#668F9A]/45 hover:border-[#668F9A] p-4 transition-colors flex items-center justify-between gap-4 active:scale-[0.99]"
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
                </button>

                {/* Local Pass & Play */}
                <button
                  onClick={() => {
                    playSound('click');
                    setShowPlayOptions(false);
                    onStart();
                  }}
                  className="w-full text-start rounded-[12px] bg-bg-card hover:bg-bg-card/80 border border-[#B49A62]/45 hover:border-[#B49A62] p-4 transition-colors flex items-center justify-between gap-4 active:scale-[0.99]"
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
                </button>
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <ModalShell maxWidthClass="max-w-sm" className="p-5">
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
                      <button
                        key={l.id}
                        onClick={() => handleSelectLanguage(l.id)}
                        className={`p-3 rounded-[10px] border flex items-center justify-between transition-colors min-h-[44px] ${
                          isSelected
                            ? 'bg-[#B49A62]/15 border-[#B49A62] text-text-main'
                            : 'bg-bg-card border-border text-text-muted hover:text-text-main hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-[11px] font-semibold px-1.5 py-0.5 rounded-[6px] bg-bg-dark/40 text-primary-text">
                            {l.code}
                          </span>
                          <span className="text-xs sm:text-sm font-bold">{l.label}</span>
                        </div>
                        {isSelected && <Check size={15} className="text-primary-text" />}
                      </button>
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
