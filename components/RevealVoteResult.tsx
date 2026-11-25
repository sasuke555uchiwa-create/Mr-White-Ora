import React, { useEffect } from 'react';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import { ArrowRight, ShieldCheck, RotateCcw, Sparkles, Heart } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getUITranslation } from '../translations';
import {
  getRoleAsset,
  getRoleTitle,
  getRoleVisualIdentity,
  getSpecialRoleDescription,
} from '../data/specialRoles';
import {
  ClassifiedStamp,
  ModalShell,
  OperationPhaseBadge,
  TacticalButton,
} from './ui/BlacksiteUI';

interface RevealVoteResultProps {
  votedPlayerId: number;
  impostorId: number;
  undercoverId?: number | null;
  players: Player[];
  onNext: () => void;
  voters?: Player[];
  isOnline?: boolean;
  isHost?: boolean;
  tieBroken?: boolean;
  blockedBySpecial?: 'boomerang' | 'protector' | null;
  bouncedFromName?: string | null;
  foolBonusTriggered?: boolean;
  loversPartnerName?: string | null;
}

export const RevealVoteResult: React.FC<RevealVoteResultProps> = ({
  votedPlayerId,
  players,
  onNext,
  voters,
  isOnline = false,
  isHost = true,
  tieBroken = false,
  blockedBySpecial = null,
  bouncedFromName = null,
  foolBonusTriggered = false,
  loversPartnerName = null,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(lang, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const votedPlayer = players.find((p) => p.id === votedPlayerId);
  const isImpostor = votedPlayer?.role === 'mrwhite';
  const isUndercover = votedPlayer?.role === 'undercover';
  const isBadGuy = isImpostor || isUndercover;
  const isSaved = blockedBySpecial === 'boomerang' || blockedBySpecial === 'protector';

  useEffect(() => {
    if (blockedBySpecial === 'protector') {
      playSound('shield');
    } else if (blockedBySpecial === 'boomerang') {
      playSound('boomerang');
    } else if (isBadGuy) {
      playSound('verdict');
    } else {
      playSound('eliminate');
    }
  }, [blockedBySpecial, isBadGuy]);

  if (!votedPlayer) return null;

  const activeSpecial = votedPlayer.specialRole || null;
  const rolePortraitSrc = getRoleAsset(votedPlayer.role);
  const roleTitle = getRoleTitle(votedPlayer.role, lang);
  const roleVisual = getRoleVisualIdentity(
    isSaved && blockedBySpecial ? blockedBySpecial : votedPlayer.role,
    lang
  );
  const specialTitle = activeSpecial ? getRoleTitle(activeSpecial, lang) : null;
  const specialDesc = activeSpecial ? getSpecialRoleDescription(activeSpecial, lang) : null;
  const specialVisual = activeSpecial ? getRoleVisualIdentity(activeSpecial, lang) : null;

  const getHeadline = () => {
    if (blockedBySpecial === 'boomerang') {
      return lang === 'ar'
        ? 'Mr. Boomerang عكس التصويت!'
        : 'Mr. Boomerang bounced the vote!';
    }
    if (blockedBySpecial === 'protector') {
      return lang === 'ar'
        ? 'درع Mr. Shield أنقذه!'
        : 'Mr. Shield Blocked the Vote!';
    }
    if (isImpostor) {
      return lang === 'ar' ? 'تم العثور على Mr. White!' : t('foundImpostor');
    }
    if (isUndercover) {
      return lang === 'ar' ? 'تم إقصاء متخفٍّ!' : t('foundUndercover');
    }
    return lang === 'ar' ? 'تم استبعاد مدني!' : t('wrongVote');
  };

  const headlineColor = isSaved
    ? 'text-cyan-text'
    : isImpostor
    ? 'text-primary-text'
    : isUndercover
    ? 'text-[#C88D5E]'
    : 'text-danger-text';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B10]/88">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <ModalShell
          ariaLabel={getHeadline()}
          className={`relative p-6 text-center flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar ${roleVisual.frameBorderClass}`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#B49A62]/65 to-transparent"
          />

          <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-border/70">
            {isSaved ? (
              <ClassifiedStamp tone="cyan">INTERCEPTED</ClassifiedStamp>
            ) : (
              <OperationPhaseBadge phase="verdict" lang={lang} />
            )}
            <ClassifiedStamp tone={roleVisual.stampTone}>{roleVisual.stamp}</ClassifiedStamp>
          </div>

          {tieBroken && (
            <div className="mb-2.5 px-3 py-1.5 rounded-[8px] bg-[#B49A62]/12 border border-[#B49A62]/35 text-xs font-semibold text-primary-text">
              {t('tieBrokenNotice')}
            </div>
          )}

          {bouncedFromName && (
            <div className="mb-2.5 px-3 py-1.5 rounded-[8px] bg-[#963F46]/15 border border-[#963F46]/40 text-xs font-semibold text-danger-text">
              {lang === 'ar'
                ? `ارتد التصويت من ${bouncedFromName} (Mr. Boomerang)!`
                : `Bounced back from ${bouncedFromName} (Mr. Boomerang)!`}
            </div>
          )}

          <h2 className={`text-lg sm:text-xl font-bold mb-4 leading-snug ${headlineColor}`}>
            {getHeadline()}
          </h2>

          {/* Eliminated/Saved Player + Clean Role Attribution */}
          <div className="mb-4 flex flex-col items-center">
            <motion.div
              initial={prefersReducedMotion ? false : { rotateY: 0 }}
              animate={prefersReducedMotion ? undefined : { rotateY: [0, 90, 0] }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="p-1.5 rounded-full border border-border-strong bg-bg-card"
            >
              <Avatar avatar={votedPlayer.avatar} name={votedPlayer.name} size={88} />
            </motion.div>

            <h3 className="text-xl font-bold text-text-main mt-3">{votedPlayer.name}</h3>

            {isSaved ? (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
                className="w-full mt-3 px-3.5 py-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-2.5 bg-[#668F9A]/15 text-cyan-text border-[#668F9A]/40"
              >
                <div className="w-8 h-8 rounded-[8px] bg-[#080B10] border border-[#668F9A]/45 overflow-hidden flex items-center justify-center shrink-0">
                  {blockedBySpecial ? (
                    <img
                      src={getRoleAsset(blockedBySpecial)}
                      alt={getRoleTitle(blockedBySpecial, lang)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : blockedBySpecial === 'boomerang' ? (
                    <RotateCcw size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                </div>
                <span>
                  {lang === 'ar'
                    ? 'الدور لا يزال سرياً · مستمر في اللعب'
                    : 'Role Hidden · Still Playing'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
                className={`w-full mt-3 px-3.5 py-2.5 rounded-[10px] border flex items-center justify-center gap-3 ${roleVisual.tintBgClass}`}
              >
                <div
                  className={`w-10 h-10 rounded-[8px] bg-[#080B10] border ${roleVisual.frameBorderClass} overflow-hidden shrink-0`}
                >
                  <img
                    src={rolePortraitSrc}
                    alt={roleTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-start min-w-0">
                  <span className="block text-[10.5px] font-semibold text-text-muted">
                    {lang === 'ar' ? 'الهوية المكشوفة' : 'Revealed Role'}
                  </span>
                  <span className={`block text-sm font-extrabold ${roleVisual.titleColorClass}`}>
                    {roleTitle}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Layered Special Role Badge & Effect */}
            {!isSaved && activeSpecial && specialTitle && specialVisual && (
              <div
                className={`w-full rounded-[10px] border p-3 mt-3 text-start flex items-center gap-3 ${specialVisual.tintBgClass}`}
              >
                <div
                  className={`w-10 h-10 rounded-[8px] bg-[#080B10] border ${specialVisual.frameBorderClass} shrink-0 overflow-hidden flex items-center justify-center`}
                >
                  <img
                    src={getRoleAsset(activeSpecial)}
                    alt={specialTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-primary-text font-bold text-xs">
                      <Sparkles size={12} />
                      <span>{specialTitle}</span>
                    </div>
                    <ClassifiedStamp tone={specialVisual.stampTone}>
                      {specialVisual.stamp}
                    </ClassifiedStamp>
                  </div>
                  {specialDesc && (
                    <p className="text-xs font-medium text-text-muted leading-snug mt-0.5">
                      {specialDesc}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mr. Joy First-Exit +4 Bonus Banner */}
            {foolBonusTriggered && (
              <div className="w-full bg-[#B49A62]/15 border border-[#B49A62]/40 rounded-[10px] p-3 mt-3 text-xs font-semibold text-primary-text leading-relaxed">
                {lang === 'ar'
                  ? 'حصل Mr. Joy على +4 نقاط إضافية لإقصائه أولاً! (تستمر الجولة حتى يفوز أحد الفريقين)'
                  : 'Mr. Joy earned +4 bonus points for first exit! (The match continues)'}
              </div>
            )}

            {/* Lovers Heartbreak Notice */}
            {loversPartnerName && (
              <div className="w-full bg-[#A8826B]/15 border border-[#A8826B]/40 rounded-[10px] p-3 mt-3 text-xs font-semibold text-[#C8A189] flex items-center justify-center gap-2">
                <Heart size={14} className="fill-current shrink-0" />
                <span>
                  {lang === 'ar'
                    ? `ارتباط العشاق: غادر ${loversPartnerName} الجولة أيضاً!`
                    : `Lovers Link: ${loversPartnerName} was eliminated too!`}
                </span>
              </div>
            )}
          </div>

          {/* Voters List */}
          {voters && voters.length > 0 && (
            <div className="mb-5 pt-3 border-t border-border">
              <p
                className={`text-text-muted font-semibold mb-2.5 text-xs ${
                  !isRTL ? 'uppercase tracking-wider' : ''
                }`}
              >
                {t('votedBy')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {voters.map((voter, idx) => (
                  <motion.div
                    key={voter.uid || voter.id || idx}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45 + idx * 0.05 }}
                    className="relative flex flex-col items-center"
                  >
                    <Avatar avatar={voter.avatar} name={voter.name} size={36} />
                    <span className="text-[11px] font-semibold text-text-muted mt-0.5 max-w-[58px] truncate">
                      {voter.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {isOnline && !isHost ? (
            <div className="w-full py-3 mt-auto rounded-[10px] bg-bg-card border border-border text-text-muted text-xs font-bold">
              {t('waitingForHostToContinue')}
            </div>
          ) : (
            <TacticalButton
              onClick={onNext}
              variant={isImpostor && !isSaved ? 'primary' : 'cyan'}
              size="lg"
              fullWidth
              className="mt-auto"
              trailingIcon={<ArrowRight size={18} className="rtl:rotate-180" />}
            >
              {isImpostor && !isSaved
                ? lang === 'ar'
                  ? 'فرصة Mr. White للتخمين'
                  : t('doesHeKnowWord')
                : lang === 'ar'
                ? 'موافق'
                : t('ok')}
            </TacticalButton>
          )}
        </ModalShell>
      </motion.div>
    </div>
  );
};
