import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Smartphone,
  ShieldAlert,
  HelpCircle,
  Check,
  EyeOff,
  Sparkles,
  Lock,
  ScanLine,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { Player, PlayerRole, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import {
  getRoleAsset,
  getRoleTitle,
  getRoleVisualIdentity,
  getSpecialRoleDescription,
} from '../data/specialRoles';
import { HERO_ASSETS } from '../src/design/assetRegistry';
import {
  ClassifiedStamp,
  IntelligencePanel,
  ModalShell,
  OperationPhaseBadge,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

interface GameRoundProps {
  players: Player[];
  rolePool: string[];
  specialRolePool?: (SpecialRoleId | null)[];
  secretWord: string;
  undercoverWord: string;
  relatedWords?: string[];
  difficulty?: 'easy' | 'hard';
  onAssignRole: (playerId: number, role: string, specialRole?: SpecialRoleId | null) => void;
  onAllRevealed: () => void;
}

export const GameRound: React.FC<GameRoundProps> = ({
  players,
  rolePool,
  specialRolePool = [],
  secretWord,
  undercoverWord,
  difficulty = 'easy',
  onAssignRole,
  onAllRevealed,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isPassing, setIsPassing] = useState(true);
  const [pickedCards, setPickedCards] = useState<Record<number, number>>({});
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null);
  const [selectedSpecial, setSelectedSpecial] = useState<SpecialRoleId | null>(null);
  const decryptTimerRef = useRef<number | null>(null);
  const revealSoundTimerRef = useRef<number | null>(null);

  const currentPlayer = players[currentPlayerIndex];
  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);

  useEffect(() => {
    return () => {
      if (decryptTimerRef.current) window.clearTimeout(decryptTimerRef.current);
      if (revealSoundTimerRef.current) window.clearTimeout(revealSoundTimerRef.current);
    };
  }, []);

  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(lang, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const handleCardClick = (index: number) => {
    if (pickedCards[index] !== undefined || isRevealed || isPassing) return;

    if (decryptTimerRef.current) window.clearTimeout(decryptTimerRef.current);
    if (revealSoundTimerRef.current) window.clearTimeout(revealSoundTimerRef.current);

    playSound('dossierOpen');
    const role = rolePool[index] as PlayerRole;
    const spRole = specialRolePool[index] ?? null;
    onAssignRole(currentPlayer.id, role, spRole);
    setSelectedCardIndex(index);
    setSelectedRole(role);
    setSelectedSpecial(spRole);
    setPickedCards((prev) => ({ ...prev, [index]: currentPlayer.id }));
    setIsRevealed(true);

    if (prefersReducedMotion) {
      setIsDecrypting(false);
      playSound('roleReveal');
    } else {
      setIsDecrypting(true);
      revealSoundTimerRef.current = window.setTimeout(() => {
        playSound('accessGranted');
      }, 170);
      decryptTimerRef.current = window.setTimeout(() => {
        setIsDecrypting(false);
        playSound('roleReveal');
      }, 420);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDecrypting) return;

    if (decryptTimerRef.current) window.clearTimeout(decryptTimerRef.current);
    if (revealSoundTimerRef.current) window.clearTimeout(revealSoundTimerRef.current);

    playSound('click');
    setIsRevealed(false);
    setIsDecrypting(false);
    setSelectedCardIndex(null);
    setSelectedRole(null);
    setSelectedSpecial(null);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex((prev) => prev + 1);
      setIsPassing(true);
    } else {
      onAllRevealed();
    }
  };

  const handleConfirmPass = () => {
    playSound('handoff');
    setIsPassing(false);
  };

  const mrWhiteCount = rolePool.filter((r) => r === 'mrwhite').length;
  const undercoverCount = rolePool.filter((r) => r === 'undercover').length;
  const activeSpecials = Array.from(
    new Set(specialRolePool.filter((r): r is SpecialRoleId => Boolean(r)))
  );

  const getWordForRole = (role: PlayerRole): string | null => {
    if (role === 'mrwhite') return null;
    if (role === 'undercover') return undercoverWord;
    return secretWord;
  };

  return (
    <div className="flex flex-col min-h-full items-center p-4 sm:p-6 animate-fade-in relative max-w-3xl mx-auto w-full">
      {/* Strictly do not mount sealed cards or any previous reveal information while Secure Device Handoff is active */}
      {!isPassing && (
        <>
          {/* Operative Briefing Header */}
          <IntelligencePanel className="w-full max-w-lg p-4 mb-4 border-[#B49A62]/35">
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-border/70">
              <OperationPhaseBadge phase="briefing" lang={lang} />
              <ClassifiedStamp tone="gold">
                {currentPlayerIndex + 1}/{players.length}
              </ClassifiedStamp>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={46} />
                <div className="min-w-0 text-start">
                  <h2 className="text-lg sm:text-xl font-bold text-text-main truncate">
                    {currentPlayer.name}
                  </h2>
                  <p className="text-text-muted font-medium text-xs sm:text-sm truncate">
                    {t('pleaseChooseCard')}
                  </p>
                </div>
              </div>
              <StatusIndicator tone="gold" icon={<Lock size={12} />}>
                {lang === 'ar' ? 'ملف مشفّر' : lang === 'fr' ? 'Scellé' : 'Sealed'}
              </StatusIndicator>
            </div>
          </IntelligencePanel>

          {/* Status Bar */}
          <div className="grid grid-cols-2 gap-3 mb-5 w-full max-w-lg">
            <PlayerIntelligenceCard className="px-3.5 py-3 flex flex-col items-center justify-center">
              <span className="text-[11px] font-semibold text-text-muted mb-1.5">
                {t('remainingIntruders')}
              </span>
              <div className="flex items-center gap-3">
                {difficulty === 'hard' ? (
                  <StatusIndicator tone="crimson" icon={<HelpCircle size={14} />}>
                    {undercoverCount + mrWhiteCount}
                  </StatusIndicator>
                ) : (
                  <>
                    {undercoverCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getRoleAsset('undercover')}
                          alt="Undercover"
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#A46F44]/50"
                        />
                        <span className="text-sm font-bold text-text-main font-mono-code tabular-nums">
                          {undercoverCount}
                        </span>
                      </div>
                    )}
                    {mrWhiteCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getRoleAsset('mrwhite')}
                          alt="Mr. White"
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#B49A62]/50"
                        />
                        <span className="text-sm font-bold text-text-main font-mono-code tabular-nums">
                          {mrWhiteCount}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </PlayerIntelligenceCard>

            <PlayerIntelligenceCard className="px-3.5 py-3 flex flex-col items-center justify-center">
              <span className="text-[11px] font-semibold text-text-muted mb-1.5">
                {t('specialRoles')}
              </span>
              {activeSpecials.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {activeSpecials.map((role) => (
                    <img
                      key={role}
                      src={getRoleAsset(role)}
                      alt={getRoleTitle(role, lang)}
                      title={getRoleTitle(role, lang)}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-border-strong"
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs font-semibold text-text-muted">{t('none')}</span>
              )}
            </PlayerIntelligenceCard>
          </div>

          {/* Sealed Mystery Card Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-xl mb-6">
            {rolePool.map((_, index) => {
              const pickerId = pickedCards[index];
              const isPicked = pickerId !== undefined;
              const isCurrentSelection = selectedCardIndex === index;
              const picker = isPicked ? players.find((p) => p.id === pickerId) : null;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={isPicked || isRevealed}
                  onClick={() => handleCardClick(index)}
                  aria-label={`${lang === 'ar' ? 'ملف سري رقم' : 'Sealed Dossier'} ${String(index + 1).padStart(2, '0')}`}
                  className={`relative aspect-[3/4] rounded-[12px] border overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 ${
                    isPicked
                      ? 'border-border-strong bg-bg-surface cursor-default opacity-80'
                      : 'border-[#B49A62]/45 hover:border-[#B49A62] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer shadow-[0_12px_28px_rgba(4,7,12,0.42)]'
                  }`}
                >
                  {isPicked && !isCurrentSelection && picker ? (
                    <div className="w-full h-full bg-bg-card flex flex-col items-center justify-between p-2.5">
                      <span className="font-mono-code text-[10px] font-semibold text-text-muted tabular-nums">
                        {String(index + 1).padStart(2, '0')} · SEALED
                      </span>
                      <Avatar avatar={picker.avatar} name={picker.name} size={42} />
                      <span className="w-full text-[11px] font-bold text-text-main truncate text-center">
                        {picker.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={HERO_ASSETS.mysteryCardBack}
                        alt="Mystery Card"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080B10]/90 via-transparent to-[#080B10]/25" />
                      <div className="absolute inset-x-0 bottom-2 flex justify-center">
                        <span className="min-w-[32px] h-7 px-2 rounded-[6px] bg-[#080B10]/92 text-[#B49A62] font-mono-code text-xs font-bold flex items-center justify-center tabular-nums border border-[#B49A62]/45">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {!isRevealed && (
            <div className="mt-auto pb-4">
              <StatusIndicator tone="crimson" icon={<ShieldAlert size={14} />}>
                {t('dontShowScreen')}
              </StatusIndicator>
            </div>
          )}
        </>
      )}

      {/* Revealed Classified Dossier Overlay */}
      <AnimatePresence>
        {!isPassing && isRevealed && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#080B10]/92 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
              className="w-full max-w-sm"
            >
              {(() => {
                const isBlindHardCard =
                  difficulty === 'hard' &&
                  (selectedRole === 'citizen' || selectedRole === 'undercover');
                const roleVisual = getRoleVisualIdentity(selectedRole, lang);
                const specialVisual = selectedSpecial
                  ? getRoleVisualIdentity(selectedSpecial, lang)
                  : null;
                const dossierBorder = isBlindHardCard
                  ? 'border-[#668F9A]/45'
                  : roleVisual.frameBorderClass;

                return (
                  <ModalShell
                    ariaLabel={
                      lang === 'ar'
                        ? `الملف السري للاعب ${currentPlayer.name}`
                        : `Classified dossier for ${currentPlayer.name}`
                    }
                    className={`relative ${dossierBorder} p-6 text-center max-h-[90vh] overflow-y-auto custom-scrollbar`}
                  >
                    {/* Subtle metallic top hairline */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#B49A62]/70 to-transparent"
                    />

                    {/* Dossier Header */}
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border/70">
                      <ClassifiedStamp tone="gold">CLASSIFIED</ClassifiedStamp>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={22} />
                        <span className="text-xs font-bold text-text-main truncate max-w-[140px]">
                          {currentPlayer.name}
                        </span>
                      </div>
                    </div>

                    {isDecrypting ? (
                      <div className="py-10 flex flex-col items-center justify-center gap-4">
                        <div className="relative w-20 h-20 rounded-[14px] bg-[#080B10] border border-[#B49A62]/45 flex items-center justify-center overflow-hidden">
                          <ScanLine size={32} className="text-primary-text" />
                          <motion.div
                            aria-hidden="true"
                            initial={{ y: -36, opacity: 0.7 }}
                            animate={{ y: 36, opacity: 1 }}
                            transition={{ duration: 0.38, ease: 'easeInOut' }}
                            className="absolute inset-x-0 h-[2px] bg-[#B49A62]"
                          />
                        </div>
                        <div className="space-y-1.5 w-full max-w-[220px]">
                          <ClassifiedStamp tone="cyan">ACCESS GRANTED</ClassifiedStamp>
                          <p className="text-xs font-semibold text-text-muted">
                            {lang === 'ar'
                              ? `جاري فك التشفير لـ ${currentPlayer.name}...`
                              : lang === 'fr'
                              ? `Déchiffrement pour ${currentPlayer.name}...`
                              : `Decrypting dossier for ${currentPlayer.name}...`}
                          </p>
                          <div className="h-1 w-full bg-bg-card rounded-full overflow-hidden">
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.38, ease: 'easeOut' }}
                              className="h-full w-full origin-left bg-[#B49A62]"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      >
                        {/* Role Stamp */}
                        <div className="mb-3 flex justify-center">
                          <ClassifiedStamp tone={isBlindHardCard ? 'cyan' : roleVisual.stampTone}>
                            {isBlindHardCard ? 'CLEARANCE · REDACTED' : roleVisual.stamp}
                          </ClassifiedStamp>
                        </div>

                        {/* Principal Role Portrait */}
                        <div
                          className={`w-24 h-24 mx-auto mb-3 rounded-[14px] bg-[#080B10] border-2 ${
                            isBlindHardCard ? 'border-[#668F9A]/55' : roleVisual.frameBorderClass
                          } flex items-center justify-center overflow-hidden shadow-lg`}
                        >
                          {isBlindHardCard ? (
                            <HelpCircle size={44} className="text-cyan-text" />
                          ) : (
                            <img
                              src={getRoleAsset(selectedRole)}
                              alt={getRoleTitle(selectedRole, lang)}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Role Identity */}
                        <h3
                          className={`text-lg sm:text-xl font-extrabold mb-1 ${
                            isBlindHardCard ? 'text-cyan-text' : roleVisual.titleColorClass
                          }`}
                        >
                          {isBlindHardCard
                            ? lang === 'ar'
                              ? 'دورك مخفي (وضع صعب)'
                              : 'Role Hidden (Hard Mode)'
                            : selectedRole === 'mrwhite'
                            ? t('youAreMrWhite')
                            : selectedRole === 'undercover'
                            ? t('youAreUndercover')
                            : getRoleTitle(selectedRole, lang)}
                        </h3>
                        <p className="text-[11px] font-semibold text-text-muted mb-4">
                          {isBlindHardCard
                            ? lang === 'ar'
                              ? 'لا يُكشف الدور الفعلي في هذا النمط'
                              : lang === 'fr'
                              ? 'Identité masquée en mode difficile'
                              : 'Allegiance concealed in Hard Mode'
                            : roleVisual.abilityLabel}
                        </p>

                        {/* Secret Word or Mr. White Zero-Word Briefing */}
                        {selectedRole === 'mrwhite' ? (
                          <div className="bg-[#B49A62]/10 border border-[#B49A62]/45 rounded-[12px] p-4 mb-4">
                            <div className="flex items-center justify-center gap-2 text-primary-text font-bold text-sm mb-1.5">
                              <EyeOff size={16} />
                              <span>
                                {lang === 'ar'
                                  ? 'ليس لديك كلمة سرية!'
                                  : lang === 'fr'
                                  ? 'Vous n’avez AUCUN mot secret !'
                                  : 'You have NO secret word!'}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-text-muted leading-relaxed">
                              {lang === 'ar'
                                ? 'استمع جيداً لوصف الآخرين وحاول استنتاج الكلمة دون أن يكتشفوك.'
                                : lang === 'fr'
                                ? 'Écoutez attentivement les indices des autres et fondez-vous dans la masse.'
                                : 'Listen carefully to everyone else and blend in!'}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-bg-card border border-[#668F9A]/45 rounded-[12px] p-4 mb-4">
                            <span className="text-[11px] font-semibold text-text-muted block mb-1">
                              {lang === 'ar'
                                ? `كلمتك السرية (${currentPlayer.name})`
                                : `${t('secretWordIs')}`}
                            </span>
                            <span
                              className={`text-2xl sm:text-3xl font-extrabold text-text-main ${
                                !isRTL ? 'tracking-wide' : ''
                              }`}
                            >
                              {getWordForRole(selectedRole)}
                            </span>
                          </div>
                        )}

                        {/* Layered Special Role Power Card */}
                        {selectedSpecial && specialVisual && (
                          <div
                            className={`rounded-[12px] border p-3.5 mb-5 text-start flex items-center gap-3 ${specialVisual.tintBgClass}`}
                          >
                            <img
                              src={getRoleAsset(selectedSpecial)}
                              alt={getRoleTitle(selectedSpecial, lang)}
                              referrerPolicy="no-referrer"
                              className={`w-12 h-12 object-cover shrink-0 rounded-[9px] bg-[#080B10] border ${specialVisual.frameBorderClass}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="flex items-center gap-1.5 text-primary-text font-bold text-xs min-w-0">
                                  <Sparkles size={13} className="shrink-0" />
                                  <span className="truncate">
                                    {getRoleTitle(selectedSpecial, lang)}
                                  </span>
                                </div>
                                <ClassifiedStamp tone={specialVisual.stampTone}>
                                  {specialVisual.stamp}
                                </ClassifiedStamp>
                              </div>
                              <p className="text-xs font-medium text-text-muted leading-snug">
                                {getSpecialRoleDescription(selectedSpecial, lang)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Explicit Operative Confirmation */}
                        <TacticalButton
                          onClick={handleNext}
                          variant="primary"
                          size="lg"
                          fullWidth
                          icon={<Check size={18} strokeWidth={2.5} />}
                        >
                          {currentPlayerIndex === players.length - 1
                            ? t('startGame')
                            : lang === 'ar'
                            ? `${currentPlayer.name} · حفظت الكلمة`
                            : lang === 'fr'
                            ? `${currentPlayer.name} · Masquer`
                            : `${currentPlayer.name} · Hide Dossier`}
                        </TacticalButton>
                      </motion.div>
                    )}
                  </ModalShell>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opaque Secure Device Handoff Privacy Guard */}
      <AnimatePresence>
        {isPassing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            className="fixed inset-0 z-50 bg-bg-dark flex flex-col items-center justify-center p-5 text-center"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                ariaLabel={
                  lang === 'ar'
                    ? `شاشة التسليم السري للاعب ${currentPlayer.name}`
                    : `Confidential device handoff for ${currentPlayer.name}`
                }
                className="relative p-7 flex flex-col items-center border-[#668F9A]/40"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#668F9A]/70 to-transparent"
                />

                <div className="w-full flex items-center justify-between mb-5">
                  <ClassifiedStamp tone="cyan">CONFIDENTIAL HANDOFF</ClassifiedStamp>
                  <ClassifiedStamp tone="neutral">
                    {currentPlayerIndex + 1}/{players.length}
                  </ClassifiedStamp>
                </div>

                <div className="w-14 h-14 rounded-[12px] bg-[#668F9A]/15 border border-[#668F9A]/40 flex items-center justify-center mb-4">
                  <Smartphone size={26} className="text-cyan-text" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-text-main mb-2">
                  {t('passPhoneToNext', { name: currentPlayer.name })}
                </h2>

                <p className="text-text-muted text-xs sm:text-sm mb-5 font-medium leading-relaxed">
                  {t('passPhoneNote')}
                </p>

                <div className="mb-6 p-2 rounded-[16px] bg-bg-card/80 border border-border">
                  <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={80} />
                </div>

                <TacticalButton
                  onClick={handleConfirmPass}
                  variant="cyan"
                  size="lg"
                  fullWidth
                  icon={<Lock size={16} />}
                >
                  {t('iAmNext', { name: currentPlayer.name })}
                </TacticalButton>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
