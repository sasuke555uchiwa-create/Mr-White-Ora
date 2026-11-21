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
import {
  IconButton,
  IntelligencePanel,
  ModalShell,
  SegmentedControl,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
  const isRTL = ['ar', 'sa'].includes(lang);
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
      subtitle: isRTL ? 'مواضيع منوعة ومشوقة' : 'Classic mixed words',
      cover: CATEGORY_COVERS.standard,
    },
    {
      id: 'animals',
      title: t('animals'),
      subtitle: isRTL ? 'حيوانات وطيور' : 'Wildlife & creatures',
      cover: CATEGORY_COVERS.animals,
    },
    {
      id: 'food',
      title: t('food'),
      subtitle: isRTL ? 'أطباق ومأكولات' : 'Dishes & drinks',
      cover: CATEGORY_COVERS.food,
    },
    {
      id: 'places',
      title: isRTL ? 'أماكن ومعالم' : t('catPlaces'),
      subtitle: isRTL ? 'مدن، سفر ووجهات' : 'Destinations & spots',
      cover: CATEGORY_COVERS.places,
    },
    {
      id: 'objects',
      title: isRTL ? 'أشياء وأدوات' : t('catObjects'),
      subtitle: isRTL ? 'أغراض يومية وأدوات' : 'Everyday props',
      cover: CATEGORY_COVERS.objects,
    },
  ];

  return (
    <div className="flex flex-col min-h-full relative px-4 py-4 max-w-4xl mx-auto w-full pb-28">
      {/* Top Players Summary Bar */}
      <IntelligencePanel className="flex items-center justify-between mb-4 p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#668F9A]/15 border border-[#668F9A]/35 flex items-center justify-center text-cyan-text shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-text-muted">{t('gameSettings')}</p>
            <h2 className="text-base sm:text-lg font-extrabold text-text-main tabular-nums">
              {t('playersLabel')}: {playersCount}
            </h2>
          </div>
        </div>
        <TacticalButton
          variant="secondary"
          size="sm"
          onClick={onEditPlayers || onBack}
          trailingIcon={<ChevronLeft size={14} className="ltr:rotate-180" />}
        >
          {isRTL ? 'تعديل الأسماء' : 'Edit Players'}
        </TacticalButton>
      </IntelligencePanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Role Distribution + Special Roles */}
        <div className="space-y-4">
          <IntelligencePanel className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-text-main">{t('roleDistribution')}</h3>
              <span className="text-xs font-bold text-text-muted tabular-nums">
                {isRTL
                  ? `الحد الأقصى للدخلاء: ${maxIntruders}`
                  : `Max infiltrators: ${maxIntruders}`}
              </span>
            </div>

            {/* Civilians Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-[10px] bg-[#668F9A]/12 border border-[#668F9A]/35">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.citizen}
                  alt="Civilians"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-[8px] bg-[#080B10] object-cover border border-[#668F9A]/40 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-bold text-text-main block text-sm sm:text-base truncate">
                    {t('citizens')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-cyan-text block leading-snug">
                    {isRTL ? 'الكلمة الحقيقية · +2 نقاط' : 'Secret word · +2 pts'}
                  </span>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-[8px] bg-[#668F9A] text-[#080B10] font-extrabold text-base tabular-nums shrink-0">
                {civilianCount}
              </span>
            </div>

            {/* Undercovers Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-[10px] bg-bg-card border border-[#A46F44]/35">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.undercover}
                  alt="Undercover"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-[8px] bg-[#080B10] object-cover border border-[#A46F44]/45 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-bold text-text-main block text-sm sm:text-base truncate">
                    {t('undercover')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-text-muted block leading-snug">
                    {isRTL ? 'كلمة قريبة · +10 نقاط' : 'Similar word · +10 pts'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-[8px] border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => changeIntruderCount('undercover', -1)}
                  disabled={undercoverCount <= 0}
                  aria-label="Decrease Undercover"
                  className="w-9 h-9 rounded-[6px] bg-bg-card hover:bg-bg-main text-text-main flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserMinus size={14} />
                </button>
                <span className="w-7 text-center text-base font-extrabold text-text-main tabular-nums">
                  {undercoverCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeIntruderCount('undercover', 1)}
                  disabled={undercoverCount >= maxIntruders}
                  aria-label="Increase Undercover"
                  className="w-9 h-9 rounded-[6px] bg-bg-card hover:bg-bg-main text-text-main flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </div>

            {/* Mr. White Row */}
            <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-[10px] bg-[#B49A62]/10 border border-[#B49A62]/40">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-[8px] bg-[#080B10] object-cover border border-[#B49A62]/50 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-bold text-text-main block text-sm sm:text-base truncate">
                    {t('mrWhite')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-primary-text block leading-snug">
                    {isRTL ? 'بدون كلمة · +6 أو +12 نقطة' : 'No word · +6 / +12 pts'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-[8px] border border-[#B49A62]/30 shrink-0">
                <button
                  type="button"
                  onClick={() => changeIntruderCount('mrwhite', -1)}
                  disabled={mrWhiteCount <= 0}
                  aria-label="Decrease Mr. White"
                  className="w-9 h-9 rounded-[6px] bg-bg-card hover:bg-bg-main text-text-main flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserMinus size={14} />
                </button>
                <span className="w-7 text-center text-base font-extrabold text-primary-text tabular-nums">
                  {mrWhiteCount}
                </span>
                <button
                  type="button"
                  onClick={() => changeIntruderCount('mrwhite', 1)}
                  disabled={mrWhiteCount >= maxIntruders}
                  aria-label="Increase Mr. White"
                  className="w-9 h-9 rounded-[6px] bg-bg-card hover:bg-bg-main text-text-main flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </div>
          </IntelligencePanel>

          {/* Special Roles Selector Card */}
          <button
            onClick={() => {
              playSound('click');
              setShowSpecialRolesModal(true);
            }}
            className="w-full text-start bg-bg-surface border border-border-strong hover:border-[#B49A62]/60 rounded-[14px] p-4 sm:p-5 shadow-[0_12px_32px_rgba(4,7,12,0.28)] transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary-text" />
                <span className="text-base font-extrabold text-text-main">
                  {t('addSpecialRoles')}
                </span>
              </div>
              <StatusIndicator tone={selectedSpecialRoles.length > 0 ? 'gold' : 'neutral'}>
                {selectedSpecialRoles.length > 0
                  ? `${selectedSpecialRoles.length} ${isRTL ? 'مُفعّل' : 'Active'}`
                  : isRTL
                  ? 'اختياري'
                  : 'Optional'}
              </StatusIndicator>
            </div>
            <p className="text-xs text-text-muted mb-3 leading-relaxed">
              {isRTL
                ? 'قدرات إضافية تُضاف فوق الدور الأساسي (لا تمنح فوزاً منفرداً)'
                : 'Bonus abilities layered over main roles (never win solo)'}
            </p>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SPECIAL_ROLES.map((role) => {
                const isSelected = selectedSpecialRoles.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className={`w-11 h-11 rounded-[9px] border flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                      isSelected
                        ? 'bg-[#080B10] border-[#B49A62] opacity-100'
                        : 'bg-[#080B10] border-border opacity-45 grayscale'
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
          <IntelligencePanel className="p-4 sm:p-5">
            <h3 className="text-base font-extrabold text-text-main mb-3">{t('wordCategory')}</h3>
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
                    className={`relative rounded-[12px] overflow-hidden border-2 text-start transition-colors ${
                      isActive
                        ? 'border-[#B49A62]'
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
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/35 to-transparent" />
                      {isActive && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-[6px] bg-[#B49A62] text-[#080B10] flex items-center justify-center shadow-md">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-xs sm:text-sm font-bold text-[#ECEFF4] leading-tight truncate">
                          {cat.title}
                        </p>
                        <p className="text-[11px] text-[#A8B1BA] truncate">
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </IntelligencePanel>

          {/* Mode, Difficulty & Turn Timer */}
          <IntelligencePanel className="p-4 sm:p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-text-main">{t('gameMode')}</h3>
                <button
                  onClick={() => setActiveInfo(activeInfo === 'mode' ? null : 'mode')}
                  className="text-text-muted hover:text-cyan-text p-1"
                  aria-label="Mode info"
                >
                  <HelpCircle size={16} />
                </button>
              </div>
              {activeInfo === 'mode' && (
                <p className="text-xs text-text-muted mb-2.5 bg-bg-card border border-border p-3 rounded-[10px] leading-relaxed">
                  {gameMode === 'expression' ? t('modeExpressionDesc') : t('modeQuestionDesc')}
                </p>
              )}
              <SegmentedControl
                value={gameMode}
                onChange={(val) => {
                  playSound('click');
                  setGameMode(val);
                }}
                className="w-full"
                options={[
                  {
                    value: 'expression',
                    label: t('modeExpression'),
                    icon: <MessageSquare size={15} />,
                  },
                  {
                    value: 'question',
                    label: t('modeQuestion'),
                    icon: <HelpCircle size={15} />,
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
              <div>
                <h3 className="text-sm font-bold text-text-main mb-2">{t('difficulty')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playSound('click');
                      setDifficulty('easy');
                    }}
                    className={`min-h-[44px] py-2 rounded-[10px] border text-xs font-bold transition-colors ${
                      difficulty === 'easy'
                        ? 'bg-[#668F9A]/15 border-[#668F9A] text-cyan-text'
                        : 'bg-bg-card border-border text-text-muted hover:text-text-main'
                    }`}
                  >
                    {t('difficultyEasy')}
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setDifficulty('hard');
                    }}
                    className={`min-h-[44px] py-2 rounded-[10px] border text-xs font-bold transition-colors ${
                      difficulty === 'hard'
                        ? 'bg-[#963F46]/18 border-[#963F46] text-danger-text'
                        : 'bg-bg-card border-border text-text-muted hover:text-text-main'
                    }`}
                  >
                    {t('difficultyHard')}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted mt-1.5 leading-snug">
                  {difficulty === 'hard' ? t('difficultyHardDesc') : t('difficultyEasyDesc')}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-text-main mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-primary-text" />
                  <span>{isRTL ? 'مؤقت الجولة' : 'Round Timer'}</span>
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        playSound('click');
                        setTurnDurationSeconds(sec);
                      }}
                      className={`min-h-[44px] py-2 rounded-[10px] border text-xs font-bold font-mono-code tabular-nums transition-colors ${
                        turnDurationSeconds === sec
                          ? 'bg-[#B49A62]/15 border-[#B49A62] text-primary-text'
                          : 'bg-bg-card border-border text-text-muted hover:text-text-main'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </IntelligencePanel>
        </div>
      </div>

      {/* Bottom Start CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-bg-dark via-bg-dark/95 to-transparent pointer-events-none flex justify-center z-30">
        <div className="w-full max-w-md pointer-events-auto">
          <TacticalButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStart}
            icon={<Play size={18} className="fill-current" />}
          >
            {isRTL ? 'ابدأ المهمة' : t('startGame')}
          </TacticalButton>
        </div>
      </div>

      {/* Special Roles Picker Modal */}
      <AnimatePresence>
        {showSpecialRolesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpecialRolesModal(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-5"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <ModalShell
                maxWidthClass="max-w-lg"
                className="rounded-b-none sm:rounded-[16px] max-h-[88vh] flex flex-col"
              >
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-bg-card">
                  <div>
                    <h3 className="text-lg font-extrabold text-text-main">{t('specialRoles')}</h3>
                    <p className="text-xs text-text-muted">
                      {isRTL
                        ? 'قدرات إضافية تُركّب على دورك الأساسي ولا تمنح فوزاً منفرداً'
                        : 'Layered over main roles · Never win the match alone'}
                    </p>
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSpecialRolesModal(false)}
                    aria-label={t('close')}
                  >
                    <X size={18} />
                  </IconButton>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                  {SPECIAL_ROLES.map((role) => {
                    const isSelected = selectedSpecialRoles.includes(role.id);
                    const isLocked = playersCount < role.minPlayers;
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleSpecialRole(role.id)}
                        disabled={isLocked}
                        className={`w-full text-start p-3 rounded-[12px] border flex items-center justify-between gap-3 transition-colors ${
                          isLocked
                            ? 'opacity-45 cursor-not-allowed bg-bg-card/50 border-border'
                            : isSelected
                            ? 'bg-[#B49A62]/12 border-[#B49A62]'
                            : 'bg-bg-card border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-[10px] bg-[#080B10] border border-border-strong overflow-hidden flex items-center justify-center">
                              <img
                                src={role.image}
                                alt={role.names[lang] || role.names.en}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {role.isNew && (
                              <span className="mt-1 block text-center text-[10px] font-bold text-primary-text">
                                {isRTL ? 'جديد' : 'NEW'}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm sm:text-base text-text-main flex items-center gap-2">
                              <span style={{ color: role.accentColor }}>
                                {role.names[lang] || role.names.en}
                              </span>
                              {role.isPair && (
                                <span className="text-xs font-semibold text-primary-text">
                                  ({isRTL ? 'ثنائي' : 'Pair'})
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                              {role.descriptions[lang] || role.descriptions.en}
                            </p>
                            {isLocked && (
                              <p className="text-xs font-bold text-danger-text mt-1">
                                {isRTL
                                  ? `يتطلب ${role.minPlayers} لاعبين على الأقل`
                                  : `Requires ${role.minPlayers}+ players`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-[7px] border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#B49A62] border-[#D4BE8A] text-[#080B10]'
                              : 'border-border-strong bg-bg-surface'
                          }`}
                        >
                          {isSelected && <Check size={15} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-border bg-bg-surface">
                  <TacticalButton
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => setShowSpecialRolesModal(false)}
                  >
                    {isRTL
                      ? `تأكيد (${selectedSpecialRoles.length} مختارة)`
                      : `Confirm (${selectedSpecialRoles.length} selected)`}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
