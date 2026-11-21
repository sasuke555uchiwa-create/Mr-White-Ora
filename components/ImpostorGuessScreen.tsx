import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Skull } from 'lucide-react';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { isMrWhiteGuessMatch } from '../src/game/wordEngine';
import { ROLE_PORTRAITS } from '../src/design/assetRegistry';

interface ImpostorGuessScreenProps {
  impostor: Player;
  secretWord?: string;
  undercoverWord?: string;
  relatedWords?: string[];
  onGuess: (isCorrect: boolean, guessedWord?: string) => void;
  onSubmitGuessText?: (guess: string) => Promise<{ isCorrect: boolean }>;
}

export const ImpostorGuessScreen: React.FC<ImpostorGuessScreenProps> = ({
  impostor,
  secretWord = '',
  onGuess,
  onSubmitGuessText,
}) => {
  const [guess, setGuess] = useState('');
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const settings = getSettings();
  const lang = settings.language;

  useEffect(() => {
    playSound('mrWhiteCaught');
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

  const handleGuess = async () => {
    const trimmed = guess.trim();
    if (hasGuessed || submitting || !trimmed) return;

    if (onSubmitGuessText) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await onSubmitGuessText(trimmed);
        const matched = Boolean(res?.isCorrect);
        setIsCorrect(matched);
        setHasGuessed(true);
        playSound(matched ? 'mrWhiteWin' : 'trumpets_sad');
      } catch {
        setSubmitError(lang === 'ar' ? 'تعذر إرسال التخمين، حاول مرة أخرى.' : 'Failed to submit guess.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const correct = isMrWhiteGuessMatch(trimmed, secretWord);
    setIsCorrect(correct);
    setHasGuessed(true);
    playSound(correct ? 'mrWhiteWin' : 'trumpets_sad');
  };

  const handleProceed = () => {
    playSound('click');
    onGuess(isCorrect, guess.trim() || undefined);
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 animate-fade-in bg-black/80 backdrop-blur-md fixed inset-0 z-[100]">
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm flex flex-col items-center text-center bg-slate-900 border border-white/15 rounded-[2.5rem] p-8 shadow-2xl relative"
      >
        {!hasGuessed ? (
          <>
            <div className="mb-5 relative">
              <div className="w-24 h-24 rounded-full bg-[#0B1120] border-4 border-amber-400/70 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] overflow-hidden">
                <img
                  src={ROLE_PORTRAITS.mrwhite}
                  alt="Mr. White"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-2 leading-tight">
              {lang === 'ar'
                ? `Mr. White (${impostor.name})`
                : t('mrWhiteGuessTitle', { name: impostor.name })}
            </h2>

            <div className="w-full space-y-6">
              <p className="text-slate-300 font-bold text-sm leading-relaxed">
                {lang === 'ar'
                  ? 'هذه فرصتك الأخيرة! خمن كلمة المدنيين السرية لسرقة الفوز باللعبة!'
                  : t('mrWhiteGuessSub')}
              </p>

              <div className="relative pb-2 border-b-2 border-amber-400 mb-4">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleGuess();
                  }}
                  placeholder={lang === 'ar' ? 'اكتب الكلمة هنا...' : 'Type word here...'}
                  className="w-full bg-transparent outline-none text-center text-2xl font-black text-white placeholder-slate-500 transition-all"
                  autoFocus
                />
              </div>

              <button
                onClick={() => void handleGuess()}
                disabled={!guess.trim() || submitting}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-lg font-black transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {lang === 'ar' ? 'تأكيد التخمين' : t('ok')}
              </button>
              {submitError && (
                <p className="text-xs font-bold text-rose-400 mt-2">{submitError}</p>
              )}
            </div>
          </>
        ) : (
          <div className="w-full animate-scale-in flex flex-col items-center">
            <div className="mb-5">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                  isCorrect
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500 text-rose-400'
                }`}
              >
                {isCorrect ? <Trophy size={44} /> : <Skull size={44} />}
              </div>
            </div>

            <h2
              className={`text-2xl font-black mb-5 ${
                isCorrect ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isCorrect
                ? lang === 'ar'
                  ? 'تخمين صحيح! Mr. White سرق الفوز!'
                  : t('heGuessedIt')
                : lang === 'ar'
                ? 'تخمين خاطئ! Mr. White أُقصي رسمياً!'
                : t('mrWhiteWrongGuess')}
            </h2>

            {!onSubmitGuessText && isCorrect && secretWord && (
              <p className="text-sm text-slate-300 mb-7 font-bold">
                {lang === 'ar'
                  ? `كلمة المدنيين كانت: "${secretWord}"`
                  : `Civilian word was: "${secretWord}"`}
              </p>
            )}

            <button
              onClick={handleProceed}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-lg font-black shadow-lg active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'متابعة' : t('ok')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
