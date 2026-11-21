import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ShieldAlert, HelpCircle, Check, EyeOff, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';
import { Player, PlayerRole, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import {
  getRoleAsset,
  getRoleTitle,
  getSpecialRoleDescription,
} from '../data/specialRoles';
import { HERO_ASSETS } from '../src/design/assetRegistry';
import {
  ClassifiedStamp,
  IntelligencePanel,
  ModalShell,
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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPassing, setIsPassing] = useState(true);
  const [pickedCards, setPickedCards] = useState<Record<number, number>>({});
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlayerRole | null>(null);
  const [selectedSpecial, setSelectedSpecial] = useState<SpecialRoleId | null>(null);

  const currentPlayer = players[currentPlayerIndex];
  const settings = getSettings();
  const lang = settings.language;

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
    if (pickedCards[index] !== undefined || isRevealed) return;

    playSound('cardFlip');
    setTimeout(() => playSound('reveal'), 110);
    const role = rolePool[index] as PlayerRole;
    const spRole = specialRolePool[index] ?? null;
    onAssignRole(currentPlayer.id, role, spRole);
    setSelectedCardIndex(index);
    setSelectedRole(role);
    setSelectedSpecial(spRole);
    setPickedCards((prev) => ({ ...prev, [index]: currentPlayer.id }));
    setIsRevealed(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('click');
    setIsRevealed(false);
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
    playSound('passPhone');
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
      {/* Operative Briefing Header */}
      <IntelligencePanel className="w-full max-w-lg p-4 mb-4">
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
          <ClassifiedStamp tone="gold">
            {currentPlayerIndex + 1}/{players.length}
          </ClassifiedStamp>
        </div>
      </IntelligencePanel>

      {/* Status Bar */}
      <div className="grid grid-cols-2 gap-3 mb-5 w-full max-w-lg">
        <IntelligencePanel className="px-3.5 py-3 flex flex-col items-center justify-center">
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
        </IntelligencePanel>

        <IntelligencePanel className="px-3.5 py-3 flex flex-col items-center justify-center">
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
        </IntelligencePanel>
      </div>

      {/* Sealed Mystery Card Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg mb-6">
        {rolePool.map((_, index) => {
          const pickerId = pickedCards[index];
          const isPicked = pickerId !== undefined;
          const isCurrentSelection = selectedCardIndex === index;
          const picker = isPicked ? players.find((p) => p.id === pickerId) : null;

          return (
            <button
              key={index}
              disabled={isPicked || isRevealed}
              onClick={() => handleCardClick(index)}
              className={`relative aspect-[3/4] rounded-[12px] border overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 ${
                isPicked
                  ? 'border-border opacity-55 cursor-default shadow-sm'
                  : 'border-[#B49A62]/45 hover:border-[#B49A62] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer shadow-[0_12px_28px_rgba(4,7,12,0.42)]'
              }`}
            >
              <img
                src={HERO_ASSETS.mysteryCardBack}
                alt="Mystery Card"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080B10]/85 via-transparent to-transparent" />
              {isPicked && !isCurrentSelection && picker ? (
                <div className="absolute inset-0 bg-[#080B10]/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-2">
                  <Avatar avatar={picker.avatar} name={picker.name} size={40} />
                  <span className="mt-1.5 text-[11px] font-bold text-[#ECEFF4] bg-[#0D1219]/90 border border-white/15 px-2 py-0.5 rounded-[6px] truncate max-w-full">
                    {picker.name}
                  </span>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-2 flex justify-center">
                  <span className="min-w-[28px] h-7 px-2 rounded-[6px] bg-[#080B10]/90 text-[#B49A62] font-mono-code text-xs font-bold flex items-center justify-center tabular-nums border border-[#B49A62]/45">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!isRevealed && !isPassing && (
        <div className="mt-auto pb-4">
          <StatusIndicator tone="crimson" icon={<ShieldAlert size={14} />}>
            {t('dontShowScreen')}
          </StatusIndicator>
        </div>
      )}

      {/* Revealed Classified Dossier Overlay */}
      <AnimatePresence>
        {isRevealed && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#080B10]/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <ModalShell className="border-[#B49A62]/40 p-6 text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <ClassifiedStamp tone="gold">CLASSIFIED</ClassifiedStamp>
                  <span className="text-xs font-bold text-text-muted truncate max-w-[160px]">
                    {currentPlayer.name}
                  </span>
                </div>

                {(() => {
                  const isBlindHardCard =
                    difficulty === 'hard' &&
                    (selectedRole === 'citizen' || selectedRole === 'undercover');

                  return (
                    <>
                      <div className="w-24 h-24 mx-auto mb-3 rounded-[12px] bg-[#080B10] border border-border-strong flex items-center justify-center overflow-hidden shadow-inner">
                        {isBlindHardCard ? (
                          <HelpCircle size={48} className="text-cyan-text" />
                        ) : (
                          <img
                            src={getRoleAsset(selectedRole)}
                            alt={getRoleTitle(selectedRole, lang)}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <h3
                        className={`text-lg font-bold mb-4 ${
                          isBlindHardCard
                            ? 'text-cyan-text'
                            : selectedRole === 'mrwhite'
                            ? 'text-primary-text'
                            : selectedRole === 'undercover'
                            ? 'text-danger-text'
                            : 'text-cyan-text'
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
                    </>
                  );
                })()}

                {/* Secret Word Box */}
                {selectedRole === 'mrwhite' ? (
                  <div className="bg-[#B49A62]/10 border border-[#B49A62]/40 rounded-[12px] p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 text-primary-text font-bold text-sm mb-1.5">
                      <EyeOff size={16} />
                      <span>
                        {lang === 'ar' ? 'ليس لديك كلمة سرية!' : 'You have NO secret word!'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-text-muted leading-relaxed">
                      {lang === 'ar'
                        ? 'استمع جيداً لوصف الآخرين وحاول استنتاج الكلمة دون أن يكتشفوك.'
                        : 'Listen carefully to everyone else and blend in!'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-bg-card border border-[#668F9A]/40 rounded-[12px] p-4 mb-4">
                    <span className="text-xs font-semibold text-text-muted block mb-1">
                      {t('secretWordIs')}
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-text-main tracking-wide">
                      {getWordForRole(selectedRole)}
                    </span>
                  </div>
                )}

                {/* Layered Special Role Power Card */}
                {selectedSpecial && (
                  <div className="bg-[#B49A62]/10 border border-[#B49A62]/35 rounded-[12px] p-3.5 mb-5 text-start flex items-center gap-3">
                    <img
                      src={getRoleAsset(selectedSpecial)}
                      alt={getRoleTitle(selectedSpecial, lang)}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 object-cover shrink-0 rounded-[8px] bg-[#080B10] border border-border-strong"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-primary-text font-bold text-xs mb-0.5">
                        <Sparkles size={13} />
                        <span>
                          {lang === 'ar'
                            ? `قدرة خاصة: ${getRoleTitle(selectedSpecial, lang)}`
                            : `Special Power: ${getRoleTitle(selectedSpecial, lang)}`}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-text-muted leading-snug">
                        {getSpecialRoleDescription(selectedSpecial, lang)}
                      </p>
                    </div>
                  </div>
                )}

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
                    ? 'حفظت الكلمة · أخفِها'
                    : t('wordHidden')}
                </TacticalButton>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass-Hand Privacy Guard Overlay */}
      <AnimatePresence>
        {isPassing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#080B10]/92 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm"
            >
              <ModalShell className="p-7 flex flex-col items-center">
                <div className="w-14 h-14 rounded-[12px] bg-[#668F9A]/15 border border-[#668F9A]/35 flex items-center justify-center mb-4">
                  <Smartphone size={28} className="text-cyan-text" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-text-main mb-2">
                  {t('passPhoneToNext', { name: currentPlayer.name })}
                </h2>

                <p className="text-text-muted text-xs sm:text-sm mb-5 font-medium leading-relaxed">
                  {t('passPhoneNote')}
                </p>

                <div className="mb-6">
                  <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={80} />
                </div>

                <TacticalButton
                  onClick={handleConfirmPass}
                  variant="cyan"
                  size="lg"
                  fullWidth
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
