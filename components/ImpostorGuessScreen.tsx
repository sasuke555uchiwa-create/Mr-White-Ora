import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Skull } from 'lucide-react';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { isMrWhiteGuessMatch } from '../src/game/wordEngine';
import { ROLE_PORTRAITS } from '../src/design/assetRegistry';
import { ClassifiedStamp, ModalShell, TacticalButton } from './ui/BlacksiteUI';

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
        setSubmitError(
          lang === 'ar' ? 'تعذر إرسال التخمين، حاول مرة أخرى.' : 'Failed to submit guess.'
        );
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
    <div className="flex flex-col h-full items-center justify-center p-5 animate-fade-in bg-[#080B10]/88 backdrop-blur-md fixed inset-0 z-[100]">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm"
      >
        <ModalShell className="border-[#B49A62]/45 p-7 text-center flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <ClassifiedStamp tone="gold">PRIORITY-OVERRIDE</ClassifiedStamp>
          </div>

          {!hasGuessed ? (
            <>
              <div className="mb-4">
                <div className="w-24 h-24 rounded-[14px] bg-[#080B10] border-2 border-[#B49A62]/65 flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src={ROLE_PORTRAITS.mrwhite}
                    alt="Mr. White"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h2 className="text-xl font-bold text-text-main mb-2 leading-tight">
                {lang === 'ar'
                  ? `Mr. White (${impostor.name})`
                  : t('mrWhiteGuessTitle', { name: impostor.name })}
              </h2>

              <div className="w-full space-y-5">
                <p className="text-text-muted font-medium text-xs sm:text-sm leading-relaxed">
                  {lang === 'ar'
                    ? 'هذه فرصتك الأخيرة! خمن كلمة المدنيين السرية لسرقة الفوز باللعبة!'
                    : t('mrWhiteGuessSub')}
                </p>

                <div className="relative pb-2 border-b-2 border-[#B49A62]">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleGuess();
                    }}
                    placeholder={lang === 'ar' ? 'اكتب الكلمة هنا...' : 'Type word here...'}
                    className="w-full bg-transparent outline-none text-center text-2xl font-bold text-text-main placeholder-text-muted/60"
                    autoFocus
                  />
                </div>

                <TacticalButton
                  onClick={() => void handleGuess()}
                  disabled={!guess.trim() || submitting}
                  loading={submitting}
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  {lang === 'ar' ? 'تأكيد التخمين' : t('ok')}
                </TacticalButton>

                {submitError && (
                  <p className="text-xs font-semibold text-danger-text">{submitError}</p>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="mb-4">
                <div
                  className={`w-20 h-20 rounded-[14px] flex items-center justify-center border-2 ${
                    isCorrect
                      ? 'bg-[#3E7B67]/20 border-[#3E7B67] text-emerald-text'
                      : 'bg-[#963F46]/20 border-[#963F46] text-danger-text'
                  }`}
                >
                  {isCorrect ? <Trophy size={38} /> : <Skull size={38} />}
                </div>
              </div>

              <h2
                className={`text-xl font-bold mb-4 ${
                  isCorrect ? 'text-emerald-text' : 'text-danger-text'
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
                <p className="text-sm text-text-muted mb-6 font-medium">
                  {lang === 'ar'
                    ? `كلمة المدنيين كانت: "${secretWord}"`
                    : `Civilian word was: "${secretWord}"`}
                </p>
              )}

              <TacticalButton
                onClick={handleProceed}
                variant="cyan"
                size="lg"
                fullWidth
              >
                {lang === 'ar' ? 'متابعة' : t('ok')}
              </TacticalButton>
            </div>
          )}
        </ModalShell>
      </motion.div>
    </div>
  );
};
