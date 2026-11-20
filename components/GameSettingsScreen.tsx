import React, { useState, useEffect } from 'react';
import { getSettings } from '../services/storageService';
import { getUITranslation } from '../translations';
import {
  Users,
  UserMinus,
  UserPlus,
  Play,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Check,
  X,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { GameMode, GameSettings, SpecialRoleId } from '../types';
import { SPECIAL_ROLES } from '../data/specialRoles';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../services/soundService';
import { CATEGORY_COVERS, ROLE_PORTRAITS } from '../src/design/assetRegistry';

interface GameSettingsScreenProps {
  playersCount: number;
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
  onEditPlayers?: () => void;
}

export const GameSettingsScreen: React.FC<GameSettingsScreenProps> = ({
  playersCount,
  onStart,
  onBack,
  onEditPlayers,
}) => {
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  const defaultMrWhite = Math.max(1, Math.floor(playersCount / 5));
  const defaultUndercover =
    playersCount >= 4 ? Math.max(1, Math.floor((playersCount - 1) / 3)) : 0;

  const [mrWhiteCount, setMrWhiteCount] = useState(
    Math.min(defaultMrWhite, Math.floor(playersCount / 2))
  );
  const [undercoverCount, setUndercoverCount] = useState(
    Math.min(defaultUndercover, Math.max(0, Math.floor(playersCount / 2) - defaultMrWhite))
  );
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [category, setCategory] = useState<string>('standard');
  const [selectedSpecialRoles, setSelectedSpecialRoles] = useState<SpecialRoleId[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('expression');
  const [turnDurationSeconds, setTurnDurationSeconds] = useState<number>(45);
  const [showSpecialRolesModal, setShowSpecialRolesModal] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const maxIntruders = Math.max(1, Math.floor((playersCount - 1) / 2));
  const intruderCount = mrWhiteCount + undercoverCount;
  const civilianCount = Math.max(1, playersCount - intruderCount);

  useEffect(() => {
    if (mrWhiteCount + undercoverCount > maxIntruders) {
      const nextMrWhite = Math.min(1, maxIntruders);
      const nextUndercover = Math.max(0, maxIntruders - nextMrWhite);
      setMrWhiteCount(nextMrWhite);
      setUndercoverCount(nextUndercover);
    }
  }, [playersCount, maxIntruders, mrWhiteCount, undercoverCount]);

  useEffect(() => {
    setSelectedSpecialRoles((prev) =>
      prev.filter((roleId) => {
        const def = SPECIAL_ROLES.find((r) => r.id === roleId);
        return def ? playersCount >= def.minPlayers : false;
      })
    );
  }, [playersCount]);

  const changeIntruderCount = (target: 'undercover' | 'mrwhite', delta: 1 | -1) => {
    const current = target === 'undercover' ? undercoverCount : mrWhiteCount;
    const other = target === 'undercover' ? mrWhiteCount : undercoverCount;
    const setTarget = target === 'undercover' ? setUndercoverCount : setMrWhiteCount;
    const setOther = target === 'undercover' ? setMrWhiteCount : setUndercoverCount;

    if (delta === 1) {
      if (current >= maxIntruders) return;
      playSound('click');
      if (intruderCount < maxIntruders) {
        setTarget(current + 1);
      } else if (other > 0) {
        setTarget(current + 1);
        setOther(other - 1);
      }
      return;
    }

    if (current <= 0) return;
    playSound('click');
    if (intruderCount > 1) {
      setTarget(current - 1);
    } else {
      setTarget(current - 1);
      setOther(other + 1);
    }
  };

  const toggleSpecialRole = (roleId: SpecialRoleId) => {
    const def = SPECIAL_ROLES.find((r) => r.id === roleId);
    if (!def || playersCount < def.minPlayers) return;
    playSound('click');
    setSelectedSpecialRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleStart = () => {
    playSound('startGame');
    onStart({
      mrWhiteCount,
      undercoverCount,
      category,
      difficulty,
      useSpecialRoles: selectedSpecialRoles.length > 0,
      selectedSpecialRoles,
      gameMode,
      turnDurationSeconds,
    });
  };

  const categories = [
    {
      id: 'standard',
      title: t('standardWords'),
      subtitle: lang === 'ar' ? 'مواضيع منوعة ومشوقة' : 'Classic mixed words',
      cover: CATEGORY_COVERS.standard,
    },
    {
      id: 'animals',
      title: t('animals'),
      subtitle: lang === 'ar' ? 'حيوانات وطيور' : 'Wildlife & creatures',
      cover: CATEGORY_COVERS.animals,
    },
    {
      id: 'food',
      title: t('food'),
      subtitle: lang === 'ar' ? 'أطباق ومأكولات' : 'Dishes & drinks',
      cover: CATEGORY_COVERS.food,
    },
    {
      id: 'places',
      title: lang === 'ar' ? 'أماكن ومعالم' : t('catPlaces'),
      subtitle: lang === 'ar' ? 'مدن، سفر ووجهات' : 'Destinations & spots',
      cover: CATEGORY_COVERS.places,
    },
    {
      id: 'objects',
      title: lang === 'ar' ? 'أشياء وأدوات' : t('catObjects'),
      subtitle: lang === 'ar' ? 'أغراض يومية وأدوات' : 'Everyday props',
      cover: CATEGORY_COVERS.objects,
    },
  ];

  return (
    <div className="flex flex-col min-h-full animate-fade-in relative px-4 py-4 max-w-4xl mx-auto w-full pb-28">
      {/* Top Players Header */}
      <div className="flex items-center justify-between mb-5 bg-bg-surface/90 backdrop-blur-md border border-border-strong rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted">{t('gameSettings')}</p>
            <h2 className="text-lg font-black text-text-main tabular-nums">
              {t('playersLabel')}: {playersCount}
            </h2>
          </div>
        </div>
        <button
          onClick={onEditPlayers || onBack}
          className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <span>{lang === 'ar' ? 'تعديل الأسماء' : 'Edit Players'}</span>
          <ChevronLeft size={14} className="ltr:rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Role Distribution + Special Roles */}
        <div className="space-y-4">
          <section className="bg-bg-surface/90 backdrop-blur-xl border border-border-strong rounded-[2rem] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-text-main">{t('roleDistribution')}</h3>
              <span className="text-xs font-bold text-text-muted tabular-nums">
                {lang === 'ar'
                  ? `الحد الأقصى للدخلاء: ${maxIntruders}`
                  : `Max infiltrators: ${maxIntruders}`}
              </span>
            </div>

            {/* Civilians Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-sky-500/15 border border-sky-400/30">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.citizen}
                  alt="Civilians"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0B1120] object-cover border border-sky-400/35 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-black text-text-main block text-sm sm:text-base truncate">
                    {t('citizens')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-sky-400 block leading-snug">
                    {lang === 'ar' ? 'الكلمة الحقيقية · +2 نقاط' : 'Secret word · +2 pts'}
                  </span>
                </div>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white font-black text-base tabular-nums shadow shrink-0">
                {civilianCount}
              </span>
            </div>

            {/* Undercovers Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-800/80 border border-white/10">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Undercover"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0B1120] object-cover border border-orange-400/35 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-black text-white block text-sm sm:text-base truncate">
                    {t('undercover')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 block leading-snug">
                    {lang === 'ar' ? 'كلمة قريبة · +10 نقاط' : 'Similar word · +10 pts'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => changeIntruderCount('undercover', -1)}
                  disabled={undercoverCount <= 0}
                  aria-label="Decrease Undercover"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserMinus size={14} />
                </button>
                <span className="w-6 text-center text-base sm:text-lg font-black text-white tabular-nums">
                  {undercoverCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeIntruderCount('undercover', 1)}
                  disabled={undercoverCount >= maxIntruders}
                  aria-label="Increase Undercover"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </div>

            {/* Mr. White Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-white/95 text-slate-900 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0B1120] object-cover border border-amber-400/50 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-black text-slate-900 block text-sm sm:text-base truncate">
                    {t('mrWhite')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 block leading-snug">
                    {lang === 'ar' ? 'بدون كلمة · +6 أو +12 نقطة' : 'No word · +6 / +12 pts'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => changeIntruderCount('mrwhite', -1)}
                  disabled={mrWhiteCount <= 0}
                  aria-label="Decrease Mr. White"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center disabled:opacity-30 shadow-sm transition-colors"
                >
                  <UserMinus size={14} />
                </button>
                <span className="w-6 text-center text-base sm:text-lg font-black text-slate-900 tabular-nums">
                  {mrWhiteCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeIntruderCount('mrwhite', 1)}
                  disabled={mrWhiteCount >= maxIntruders}
                  aria-label="Increase Mr. White"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center disabled:opacity-30 shadow-sm transition-colors"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* Special Roles Selector Card */}
          <button
            onClick={() => {
              playSound('click');
              setShowSpecialRolesModal(true);
            }}
            className="w-full text-start bg-bg-surface/90 backdrop-blur-xl border border-border-strong hover:border-sky-400/60 rounded-[2rem] p-5 shadow-xl transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-amber-400" />
                <span className="text-base font-black text-text-main">{t('addSpecialRoles')}</span>
              </div>
              <span className="text-xs font-black text-sky-400 tabular-nums">
                {selectedSpecialRoles.length > 0
                  ? `${selectedSpecialRoles.length} ${lang === 'ar' ? 'مُفعّل' : 'Active'}`
                  : lang === 'ar'
                  ? 'اختياري'
                  : 'Optional'}
              </span>
            </div>
            <p className="text-xs font-bold text-text-muted mb-3">
              {lang === 'ar'
                ? 'قدرات إضافية تُضاف فوق الدور الأساسي (لا تمنح فوزاً منفرداً)'
                : 'Bonus abilities layered over main roles (never win solo)'}
            </p>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SPECIAL_ROLES.map((role) => {
                const isSelected = selectedSpecialRoles.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                      isSelected
                        ? 'bg-[#0B1120] border-sky-400 scale-105 shadow-md'
                        : 'bg-[#0B1120] border-border opacity-50 grayscale'
                    }`}
                  >
                    <img
                      src={role.image}
                      alt={role.names[lang] || role.names.en}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          </button>
        </div>

        {/* Right Column: Decks + Mode + Timer */}
        <div className="space-y-4">
          {/* Word Category Decks */}
          <section className="bg-bg-surface/90 backdrop-blur-xl border border-border-strong rounded-[2rem] p-5 shadow-xl">
            <h3 className="text-base font-black text-text-main mb-3">{t('wordCategory')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playSound('click');
                      setCategory(cat.id);
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 text-start transition-all active:scale-95 ${
                      isActive
                        ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                        : 'border-border opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full relative">
                      <img
                        src={cat.cover}
                        alt={cat.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                      {isActive && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                          {cat.title}
                        </p>
                        <p className="text-[11px] font-bold text-white/80 truncate">
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mode, Difficulty & Turn Timer */}
          <section className="bg-bg-surface/90 backdrop-blur-xl border border-border-strong rounded-[2rem] p-5 shadow-xl space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-text-main">{t('gameMode')}</h3>
                <button
                  onClick={() => setActiveInfo(activeInfo === 'mode' ? null : 'mode')}
                  className="text-text-muted hover:text-sky-400"
                >
                  <HelpCircle size={16} />
                </button>
              </div>
              {activeInfo === 'mode' && (
                <p className="text-xs font-bold text-text-muted mb-2.5 bg-bg-card p-3 rounded-xl">
                  {gameMode === 'expression' ? t('modeExpressionDesc') : t('modeQuestionDesc')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    playSound('click');
                    setGameMode('expression');
                  }}
                  className={`p-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                    gameMode === 'expression'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-400'
                      : 'bg-bg-card border-border text-text-muted'
                  }`}
                >
                  <MessageSquare size={16} />
                  <span>{t('modeExpression')}</span>
                </button>
                <button
                  onClick={() => {
                    playSound('click');
                    setGameMode('question');
                  }}
                  className={`p-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                    gameMode === 'question'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-400'
                      : 'bg-bg-card border-border text-text-muted'
                  }`}
                >
                  <HelpCircle size={16} />
                  <span>{t('modeQuestion')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <h3 className="text-sm font-black text-text-main mb-2">{t('difficulty')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playSound('click');
                      setDifficulty('easy');
                    }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                      difficulty === 'easy'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                        : 'bg-bg-card border-border text-text-muted'
                    }`}
                  >
                    {t('difficultyEasy')}
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setDifficulty('hard');
                    }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                      difficulty === 'hard'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-400'
                        : 'bg-bg-card border-border text-text-muted'
                    }`}
                  >
                    {t('difficultyHard')}
                  </button>
                </div>
                <p className="text-[11px] font-bold text-text-muted mt-1.5 leading-snug">
                  {difficulty === 'hard' ? t('difficultyHardDesc') : t('difficultyEasyDesc')}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black text-text-main mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-400" />
                  <span>{lang === 'ar' ? 'مؤقت الجولة' : 'Round Timer'}</span>
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        playSound('click');
                        setTurnDurationSeconds(sec);
                      }}
                      className={`py-2.5 rounded-xl border-2 text-xs font-black tabular-nums transition-all ${
                        turnDurationSeconds === sec
                          ? 'bg-sky-500/20 border-sky-400 text-sky-400'
                          : 'bg-bg-card border-border text-text-muted'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Start CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-bg-dark via-bg-dark/95 to-transparent pointer-events-none flex justify-center z-30">
        <button
          onClick={handleStart}
          className="w-full max-w-md py-3.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg sm:text-xl font-black shadow-[0_5px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-3 pointer-events-auto"
        >
          <Play size={22} className="fill-current" />
          <span>{lang === 'ar' ? 'ابدأ' : t('startGame')}</span>
        </button>
      </div>

      {/* Special Roles Picker Modal */}
      <AnimatePresence>
        {showSpecialRolesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpecialRolesModal(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-5"
          >
            <motion.div
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 36, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-bg-surface border border-border-strong rounded-t-[2rem] sm:rounded-[2rem] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-sky-500 text-white">
                <div>
                  <h3 className="text-xl font-black">{t('specialRoles')}</h3>
                  <p className="text-xs font-bold text-white/90">
                    {lang === 'ar'
                      ? 'قدرات إضافية تُركّب على دورك الأساسي ولا تمنح فوزاً منفرداً'
                      : 'Layered over main roles · Never win the match alone'}
                  </p>
                </div>
                <button
                  onClick={() => setShowSpecialRolesModal(false)}
                  className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {SPECIAL_ROLES.map((role) => {
                  const isSelected = selectedSpecialRoles.includes(role.id);
                  const isLocked = playersCount < role.minPlayers;
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleSpecialRole(role.id)}
                      disabled={isLocked}
                      className={`w-full text-start p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                        isLocked
                          ? 'opacity-45 cursor-not-allowed bg-bg-card/50 border-border'
                          : isSelected
                          ? 'bg-sky-500/15 border-sky-400 shadow-md'
                          : 'bg-bg-card border-border hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-[#0B1120] border border-white/15 shadow-sm overflow-hidden flex items-center justify-center">
                            <img
                              src={role.image}
                              alt={role.names[lang] || role.names.en}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {role.isNew && (
                            <span className="mt-1 block text-center text-[10px] font-black text-amber-400">
                              {lang === 'ar' ? 'جديد' : 'NEW'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-base text-text-main flex items-center gap-2">
                            <span style={{ color: role.accentColor }}>
                              {role.names[lang] || role.names.en}
                            </span>
                            {role.isPair && (
                              <span className="text-xs font-bold text-pink-400">
                                ({lang === 'ar' ? 'ثنائي' : 'Pair'})
                              </span>
                            )}
                          </h4>
                          <p className="text-xs font-bold text-text-muted leading-relaxed mt-0.5">
                            {role.descriptions[lang] || role.descriptions.en}
                          </p>
                          {isLocked && (
                            <p className="text-xs font-black text-rose-400 mt-1">
                              {lang === 'ar'
                                ? `يتطلب ${role.minPlayers} لاعبين على الأقل`
                                : `Requires ${role.minPlayers}+ players`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-white'
                            : 'border-border-strong bg-bg-dark/40'
                        }`}
                      >
                        {isSelected && <Check size={16} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-border bg-bg-surface">
                <button
                  onClick={() => setShowSpecialRolesModal(false)}
                  className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-base shadow-lg transition-colors"
                >
                  {lang === 'ar'
                    ? `تأكيد (${selectedSpecialRoles.length} مختارة)`
                    : `Confirm (${selectedSpecialRoles.length} selected)`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
