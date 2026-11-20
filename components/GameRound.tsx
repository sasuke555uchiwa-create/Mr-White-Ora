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
      {/* Header Info */}
      <div className="w-full max-w-lg text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={48} />
          <h2 className="text-2xl font-black text-text-main">{currentPlayer.name}</h2>
        </div>
        <p className="text-text-muted font-bold text-sm sm:text-base">{t('pleaseChooseCard')}</p>
      </div>

      {/* Status Bar */}
      <div className="flex gap-3 mb-6 w-full max-w-lg justify-center">
        <div className="bg-bg-surface/90 border border-border-strong rounded-2xl px-4 py-3 flex-1 flex flex-col items-center shadow-lg">
          <span className="text-xs font-black text-text-muted mb-1.5">
            {t('remainingIntruders')}
          </span>
          <div className="flex items-center gap-3">
            {difficulty === 'hard' ? (
              <div className="flex items-center gap-1.5">
                <HelpCircle size={22} className="text-rose-400" />
                <span className="text-lg font-black text-text-main tabular-nums">
                  {undercoverCount + mrWhiteCount}
                </span>
              </div>
            ) : (
              <>
                {undercoverCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <img
                      src={getRoleAsset('undercover')}
                      alt="Undercover"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full bg-[#0B1120] object-cover border border-orange-400/40"
                    />
                    <span className="text-lg font-black text-text-main tabular-nums">
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
                      className="w-7 h-7 rounded-full bg-[#0B1120] object-cover border border-amber-400/50"
                    />
                    <span className="text-lg font-black text-text-main tabular-nums">
                      {mrWhiteCount}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-bg-surface/90 border border-border-strong rounded-2xl px-4 py-3 flex-1 flex flex-col items-center shadow-lg">
          <span className="text-xs font-black text-text-muted mb-1.5">{t('specialRoles')}</span>
          {activeSpecials.length > 0 ? (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {activeSpecials.map((role) => (
                <img
                  key={role}
                  src={getRoleAsset(role)}
                  alt={getRoleTitle(role, lang)}
                  title={getRoleTitle(role, lang)}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full bg-[#0B1120] object-cover border border-white/30"
                />
              ))}
            </div>
          ) : (
            <span className="text-sm font-black text-text-muted">{t('none')}</span>
          )}
        </div>
      </div>

      {/* Mystery Card Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-lg mb-6">
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
              className={`relative aspect-[3/4] rounded-2xl border-2 overflow-hidden shadow-xl transition-transform ${
                isPicked
                  ? 'border-white/15 opacity-55 cursor-default'
                  : 'border-amber-400/50 hover:scale-105 active:scale-95 cursor-pointer hover:border-amber-300'
              }`}
            >
              <img
                src={HERO_ASSETS.mysteryCardBack}
                alt="Mystery Card"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {isPicked && !isCurrentSelection && picker ? (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-2">
                  <Avatar avatar={picker.avatar} name={picker.name} size={42} />
                  <span className="mt-1.5 text-xs font-black text-white bg-black/75 px-2 py-0.5 rounded-lg truncate max-w-full">
                    {picker.name}
                  </span>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-2 flex justify-center">
                  <span className="w-7 h-7 rounded-full bg-slate-950/85 text-amber-300 text-xs font-black flex items-center justify-center tabular-nums border border-amber-400/40">
                    {index + 1}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!isRevealed && !isPassing && (
        <p className="text-text-muted font-bold text-sm flex items-center gap-2 mt-auto pb-4">
          <ShieldAlert size={18} className="text-rose-400" />
          <span>{t('dontShowScreen')}</span>
        </p>
      )}

      {/* Revealed Secret Word + Layered Special Power Overlay */}
      <AnimatePresence>
        {isRevealed && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.88, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm bg-bg-surface border-2 border-white/15 rounded-[2.25rem] p-6 text-center shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              {/* Primary Role Illustration */}
              {(() => {
                const isBlindHardCard =
                  difficulty === 'hard' &&
                  (selectedRole === 'citizen' || selectedRole === 'undercover');

                return (
                  <>
                    <div className="w-28 h-28 mx-auto mb-3 rounded-3xl bg-[#0B1120] border border-white/15 flex items-center justify-center overflow-hidden shadow-inner">
                      {isBlindHardCard ? (
                        <HelpCircle size={58} className="text-sky-400" />
                      ) : (
                        <img
                          src={getRoleAsset(selectedRole)}
                          alt={getRoleTitle(selectedRole, lang)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <p className="text-xs font-black text-text-muted mb-1">{currentPlayer.name}</p>

                    <h3
                      className={`text-xl font-black mb-3 ${
                        isBlindHardCard
                          ? 'text-sky-400'
                          : selectedRole === 'mrwhite'
                          ? 'text-amber-400'
                          : selectedRole === 'undercover'
                          ? 'text-rose-400'
                          : 'text-sky-400'
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
                <div className="bg-amber-500/15 border border-amber-400/40 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-base mb-1">
                    <EyeOff size={18} />
                    <span>
                      {lang === 'ar' ? 'ليس لديك كلمة سرية!' : 'You have NO secret word!'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-text-muted leading-relaxed">
                    {lang === 'ar'
                      ? 'استمع جيداً لوصف الآخرين وحاول استنتاج الكلمة دون أن يكتشفوك.'
                      : 'Listen carefully to everyone else and blend in!'}
                  </p>
                </div>
              ) : (
                <div className="bg-sky-500/15 border border-sky-400/40 rounded-2xl p-4 mb-4">
                  <span className="text-xs font-bold text-text-muted block mb-1">
                    {t('secretWordIs')}
                  </span>
                  <span className="text-3xl font-black text-text-main tracking-wide">
                    {getWordForRole(selectedRole)}
                  </span>
                </div>
              )}

              {/* Layered Special Role Power Card */}
              {selectedSpecial && (
                <div className="bg-violet-500/15 border border-violet-400/40 rounded-2xl p-3.5 mb-5 text-start flex items-center gap-3">
                  <img
                    src={getRoleAsset(selectedSpecial)}
                    alt={getRoleTitle(selectedSpecial, lang)}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover shrink-0 rounded-xl bg-[#0B1120] border border-white/15 shadow-sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-violet-300 font-black text-xs mb-0.5">
                      <Sparkles size={13} />
                      <span>
                        {lang === 'ar'
                          ? `قدرة خاصة: ${getRoleTitle(selectedSpecial, lang)}`
                          : `Special Power: ${getRoleTitle(selectedSpecial, lang)}`}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-text-muted leading-snug">
                      {getSpecialRoleDescription(selectedSpecial, lang)}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full py-4 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg font-black shadow-[0_5px_0_#15803d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} strokeWidth={3} />
                <span>
                  {currentPlayerIndex === players.length - 1
                    ? t('startGame')
                    : lang === 'ar'
                    ? 'حفظت الكلمة · أخفِها'
                    : t('wordHidden')}
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass Phone Modal */}
      <AnimatePresence>
        {isPassing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-bg-surface border border-border-strong rounded-[2.5rem] p-8 flex flex-col items-center max-w-sm w-full shadow-2xl"
            >
              <div className="w-20 h-20 bg-sky-500/15 rounded-full flex items-center justify-center mb-5 border border-sky-400/30">
                <Smartphone size={38} className="text-sky-400" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-text-main mb-2">
                {t('passPhoneToNext', { name: currentPlayer.name })}
              </h2>

              <p className="text-text-muted text-sm mb-6 font-bold leading-relaxed">
                {t('passPhoneNote')}
              </p>

              <div className="mb-7">
                <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} size={88} />
              </div>

              <button
                onClick={handleConfirmPass}
                className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-lg font-black shadow-[0_5px_0_#0369a1] active:translate-y-1 active:shadow-none transition-all"
              >
                {t('iAmNext', { name: currentPlayer.name })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
