import React, { useState } from 'react';
import { getSettings, saveSettings } from '../services/storageService';
import { getUITranslation } from '../translations';
import { Globe, Users, HelpCircle, X, Gamepad2, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './Avatar';
import { playSound } from '../services/soundService';
import { HERO_ASSETS, ROLE_PORTRAITS } from '../src/design/assetRegistry';

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
  { id: 'ar', label: 'العربية', code: 'AR', bg: 'bg-emerald-600' },
  { id: 'en', label: 'English', code: 'EN', bg: 'bg-sky-600' },
  { id: 'fr', label: 'Français', code: 'FR', bg: 'bg-indigo-600' },
  { id: 'es', label: 'Español', code: 'ES', bg: 'bg-amber-600' },
  { id: 'de', label: 'Deutsch', code: 'DE', bg: 'bg-rose-600' },
  { id: 'tr', label: 'Türkçe', code: 'TR', bg: 'bg-red-600' },
  { id: 'pt', label: 'Português', code: 'PT', bg: 'bg-teal-600' },
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
  currentTheme,
}) => {
  const settings = getSettings();
  const { user, profile, loading } = useAuth();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const avatarSrc = profile
    ? profile.photoURL || ''
    : user
    ? user.photoURL || ''
    : settings.avatar || '';

  const displayName = profile?.displayName || user?.displayName || (lang === 'ar' ? 'اللاعب' : 'Player');
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
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center px-5 pt-5 pb-2 z-30">
        <button
          onClick={() => {
            playSound('click');
            onShowProfile();
          }}
          className="active:scale-95 transition-transform flex items-center gap-3 rounded-full bg-bg-surface/80 backdrop-blur-md border border-border-strong p-1.5 pr-3 shadow-lg hover:border-primary/60"
        >
          <Avatar
            avatar={avatarSrc}
            name={displayName}
            size={44}
            status={loading ? 'waiting' : 'none'}
          />
          <span className="text-sm font-black text-text-main max-w-[110px] truncate hidden sm:inline">
            {displayName}
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playSound('click');
              onShowRules();
            }}
            title={t('howToPlay')}
            className="w-11 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white border-2 border-black/80 shadow-[0_4px_0_rgba(0,0,0,0.85)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
          >
            <HelpCircle size={22} />
          </button>

          <button
            onClick={() => {
              playSound('click');
              setShowLangModal(true);
            }}
            className={`${activeLangObj.bg} border-2 border-black/90 rounded-2xl px-3.5 py-2 font-black text-white text-xs sm:text-sm shadow-[0_4px_0_rgba(0,0,0,0.85)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5 whitespace-nowrap`}
          >
            <Globe size={16} />
            <span>{activeLangObj.label}</span>
          </button>
        </div>
      </header>

      {/* Center Hero Showcase + Play Trigger */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 z-20 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-xl flex flex-col items-center text-center"
        >
          {/* Hero Art Frame */}
          <div className="relative w-full aspect-[16/9] max-h-[240px] sm:max-h-[270px] rounded-[2rem] overflow-hidden border border-sky-400/25 shadow-[0_20px_50px_rgba(2,6,23,0.6)] mb-5 bg-[#0B1120]">
            <img
              src={HERO_ASSETS.mainBanner}
              alt="Undercover Hero"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/95 via-[#070B14]/35 to-transparent flex flex-col justify-end p-5">
              <div className="flex items-end justify-between gap-4">
                <div className="text-start">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md leading-none">
                    UNDERCOVER
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-amber-300 mt-1.5">
                    {lang === 'ar' ? 'المتخفي · لعبة الذكاء والتمويه الجماعية' : 'Civilians · Undercovers · Mr. White'}
                  </p>
                </div>
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Agent"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-amber-400/40 shadow-[0_6px_16px_rgba(0,0,0,0.65)] shrink-0 bg-[#0B1120]"
                />
              </div>
            </div>
          </div>

          {/* Signature Yanstar Play Button + Role Lineup */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
            <button
              onClick={() => {
                playSound('pop');
                setShowPlayOptions(true);
              }}
              className={`group relative w-56 h-24 sm:w-64 sm:h-28 rounded-2xl border-[3px] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl overflow-hidden ${
                currentTheme === 'light'
                  ? 'border-slate-900 bg-white/85 hover:bg-white text-slate-900'
                  : 'border-white/90 bg-slate-900/75 hover:bg-slate-900/95 text-white'
              } backdrop-blur-md`}
            >
              <img
                src={ROLE_PORTRAITS.mrwhite}
                alt="Spy"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-amber-400/40 -ml-1 group-hover:scale-105 transition-transform shadow-md bg-[#0B1120]"
              />
              <div className="flex flex-col items-start">
                <span className="text-xl sm:text-2xl font-black tracking-wide">
                  {lang === 'ar' ? 'ابدأ اللعب' : t('play')}
                </span>
                <span className="text-xs font-bold opacity-75">
                  {lang === 'ar' ? 'أونلاين أو نفس الهاتف' : 'Online or Pass & Play'}
                </span>
              </div>
              <div
                className={`w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] shrink-0 ${
                  currentTheme === 'light' ? 'border-l-slate-900' : 'border-l-emerald-400'
                } rtl:rotate-180`}
              />
            </button>

            {/* Quick Role Trio Preview */}
            <div className="flex items-center gap-2 bg-bg-surface/90 border border-border-strong rounded-2xl px-4 py-3 shadow-lg">
              <div className="flex -space-x-3 rtl:space-x-reverse">
                <img
                  src={ROLE_PORTRAITS.citizen}
                  alt="Civilian"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full bg-[#0B1120] border-2 border-sky-400 object-cover"
                />
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Undercover"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full bg-[#0B1120] border-2 border-orange-400 object-cover"
                />
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full bg-[#0B1120] border-2 border-amber-300 object-cover"
                />
              </div>
              <div className="text-start px-2">
                <p className="text-xs font-black text-text-main whitespace-nowrap">
                  {lang === 'ar' ? '8 أدوار خاصة' : '8 Special Roles'}
                </p>
                <p className="text-[11px] font-bold text-text-muted whitespace-nowrap">
                  {lang === 'ar' ? '3 – 20 لاعب' : '3 – 20 Players'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom 5-Icon Cartoon Dock (matching Yanstar Undercover home bar) */}
      <nav className="w-full max-w-2xl mx-auto px-4 pb-5 pt-2 z-20">
        <div className="bg-bg-surface/90 backdrop-blur-xl border border-border-strong rounded-3xl px-3 py-2.5 shadow-2xl grid grid-cols-5 gap-2">
          <DockItem
            src="/i2.png"
            label={lang === 'ar' ? 'المقتنيات' : 'Vault'}
            onClick={() => {
              playSound('click');
              onShowInventory();
            }}
          />
          <DockItem
            src="/i1.png"
            label={lang === 'ar' ? 'الترتيب' : 'Ranks'}
            onClick={() => {
              playSound('click');
              onShowScoreboard();
            }}
          />
          <DockItem
            src="/i3.png"
            label={lang === 'ar' ? 'الكلمات' : 'Words'}
            onClick={() => {
              playSound('click');
              onShowDictionary();
            }}
          />
          <DockItem
            src="/i5.png"
            label={lang === 'ar' ? 'المجموعات' : 'Players'}
            onClick={() => {
              playSound('click');
              onManagePlayers();
            }}
          />
          <DockItem
            src="/i4.png"
            label={lang === 'ar' ? 'الإعدادات' : 'Settings'}
            onClick={() => {
              playSound('click');
              onOpenSettings();
            }}
          />
        </div>
      </nav>

      {/* Yanstar-Style Play Mode Selection Modal */}
      <AnimatePresence>
        {showPlayOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlayOptions(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2rem] p-5 shadow-2xl border-2 border-white/20 space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-black">
                  {lang === 'ar' ? 'اختر طريقة اللعب' : 'Choose Game Mode'}
                </h2>
                <button
                  onClick={() => setShowPlayOptions(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Online Card */}
              <button
                onClick={() => {
                  playSound('click');
                  setShowPlayOptions(false);
                  onShowOnline();
                }}
                className="w-full text-start rounded-2xl bg-[#1da1f2] hover:bg-[#1a91da] text-white p-5 shadow-[0_5px_0_#0f6da8] active:translate-y-1 active:shadow-none transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xl font-black flex items-center gap-2">
                    <span>{lang === 'ar' ? 'لعب بالإنترنت' : t('playOnline')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white/90 leading-relaxed">
                    {lang === 'ar'
                      ? 'العب عبر الإنترنت في غرف عامة أو خاصة مع أصدقائك.'
                      : 'Play online in public or private rooms with friends.'}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <div className="relative">
                    <Globe size={34} className="text-white" />
                    <Gamepad2 size={18} className="text-amber-300 absolute -bottom-1 -right-1" />
                  </div>
                </div>
              </button>

              {/* Pass & Play Card */}
              <button
                onClick={() => {
                  playSound('click');
                  setShowPlayOptions(false);
                  onStart();
                }}
                className="w-full text-start rounded-2xl bg-[#2dd4bf] hover:bg-[#14b8a6] text-slate-950 p-5 shadow-[0_5px_0_#0f766e] active:translate-y-1 active:shadow-none transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="text-xl font-black flex items-center gap-2">
                    <span>
                      {lang === 'ar' ? 'لعب على نفس الهاتف' : t('playOffline')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900/80 leading-relaxed">
                    {lang === 'ar'
                      ? 'مرر الهاتف بين الأصدقاء الجالسين معاً في نفس الغرفة.'
                      : 'Everyone plays on one device. Gather around together!'}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-black/10 flex items-center justify-center shrink-0">
                  <div className="relative">
                    <Smartphone size={34} className="text-slate-950" />
                    <Users size={16} className="text-white bg-slate-900 rounded-full p-0.5 absolute -bottom-1 -right-1" />
                  </div>
                </div>
              </button>
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-bg-surface border border-border-strong rounded-[2rem] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                  <Globe size={20} className="text-emerald-400" />
                  <span>{t('language')}</span>
                </h3>
                <button
                  onClick={() => setShowLangModal(false)}
                  className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted hover:text-text-main"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_LANGUAGES.map((l) => {
                  const isSelected = l.id === lang;
                  return (
                    <button
                      key={l.id}
                      onClick={() => handleSelectLanguage(l.id)}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-95 ${
                        isSelected
                          ? `${l.bg} border-white text-white shadow-lg`
                          : 'bg-bg-card border-border text-text-main hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/25">
                          {l.code}
                        </span>
                        <span className="text-sm font-bold">{l.label}</span>
                      </div>
                      {isSelected && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DockItem = ({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl hover:bg-white/10 active:scale-95 transition-all group"
  >
    <img
      src={src}
      alt={label}
      referrerPolicy="no-referrer"
      className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md group-hover:-translate-y-0.5 transition-transform"
    />
    <span className="text-[11px] font-bold text-text-main truncate max-w-full">
      {label}
    </span>
  </button>
);
