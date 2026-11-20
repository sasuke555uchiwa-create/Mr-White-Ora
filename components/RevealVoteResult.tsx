import React, { useEffect } from 'react';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import { ArrowRight, ShieldCheck, RotateCcw, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getUITranslation } from '../translations';
import {
  getRoleAsset,
  getRoleBadgeIcon,
  getRoleTitle,
  getSpecialRoleDescription,
} from '../data/specialRoles';

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
      playSound('win');
    } else {
      playSound('eliminate');
    }
  }, [blockedBySpecial, isBadGuy]);

  if (!votedPlayer) return null;

  const activeSpecial = votedPlayer.specialRole || null;
  const roleBadgeSrc = getRoleBadgeIcon(votedPlayer.role);
  const rolePortraitSrc = getRoleAsset(votedPlayer.role);
  const roleTitle = getRoleTitle(votedPlayer.role, lang);
  const specialTitle = activeSpecial ? getRoleTitle(activeSpecial, lang) : null;
  const specialDesc = activeSpecial ? getSpecialRoleDescription(activeSpecial, lang) : null;

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
    ? 'text-sky-300'
    : isImpostor
    ? 'text-amber-300'
    : isUndercover
    ? 'text-purple-300'
    : 'text-rose-300';

  const rolePillStyle = isImpostor
    ? 'bg-slate-100 text-slate-900 border-slate-300'
    : isUndercover
    ? 'bg-purple-600/30 text-purple-200 border-purple-400/50'
    : 'bg-sky-500/25 text-sky-200 border-sky-400/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-white/15 rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm relative shadow-2xl text-center flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="mx-auto -mt-2 mb-3 relative">
          <div className="w-20 h-20 rounded-full bg-[#0B1120] border-4 border-white/25 shadow-xl flex items-center justify-center overflow-hidden">
            <img
              src={isSaved && blockedBySpecial ? getRoleAsset(blockedBySpecial) : rolePortraitSrc}
              alt={isSaved && blockedBySpecial ? getRoleTitle(blockedBySpecial, lang) : roleTitle}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          {isSaved && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-sky-500 text-white border-2 border-slate-900 flex items-center justify-center shadow">
              {blockedBySpecial === 'boomerang' ? (
                <RotateCcw size={15} />
              ) : (
                <ShieldCheck size={15} />
              )}
            </div>
          )}
        </div>

        {tieBroken && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs font-black text-amber-200">
            {t('tieBrokenNotice')}
          </div>
        )}

        {bouncedFromName && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs font-black text-rose-200">
            {lang === 'ar'
              ? `ارتد التصويت من ${bouncedFromName} (Mr. Boomerang)!`
              : `Bounced back from ${bouncedFromName} (Mr. Boomerang)!`}
          </div>
        )}

        <h2 className={`text-xl sm:text-2xl font-black mb-4 leading-snug ${headlineColor}`}>
          {getHeadline()}
        </h2>

        {/* Eliminated/Saved Player + Role Badge (Hidden when saved & still playing) */}
        <div className="mb-4 flex flex-col items-center">
          <motion.div
            initial={{ rotateY: 0 }}
            animate={{ rotateY: [0, 90, 0] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <Avatar avatar={votedPlayer.avatar} name={votedPlayer.name} size={102} />
            <div
              className={`absolute -bottom-2 -right-2 w-11 h-11 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center overflow-hidden ${
                isSaved ? 'bg-sky-500 text-white p-1' : 'bg-[#0B1120]'
              }`}
            >
              {isSaved ? (
                blockedBySpecial === 'boomerang' ? (
                  <RotateCcw size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )
              ) : (
                <img
                  src={roleBadgeSrc}
                  alt={roleTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </motion.div>

          <h3 className="text-2xl font-black text-white mt-4">{votedPlayer.name}</h3>

          {isSaved ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring' }}
              className="mt-2 px-5 py-1.5 rounded-full text-sm font-black border shadow-lg flex items-center gap-2 bg-sky-500/20 text-sky-200 border-sky-400/50"
            >
              {blockedBySpecial === 'boomerang' ? (
                <RotateCcw size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              <span>
                {lang === 'ar'
                  ? 'الدور لا يزال سرياً · مستمر في اللعب'
                  : 'Role Hidden · Still Playing'}
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring' }}
              className={`mt-2 px-5 py-1.5 rounded-full text-sm font-black border shadow-lg flex items-center gap-2 ${rolePillStyle}`}
            >
              <img
                src={roleBadgeSrc}
                alt={roleTitle}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{roleTitle}</span>
            </motion.div>
          )}

          {/* Layered Special Role Badge & Effect (Only revealed on actual elimination) */}
          {!isSaved && activeSpecial && specialTitle && (
            <div className="w-full bg-violet-500/15 border border-violet-400/35 rounded-2xl p-3 mt-3 text-start flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0B1120] border border-white/15 shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
                <img
                  src={getRoleAsset(activeSpecial)}
                  alt={specialTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-violet-300 font-black text-xs">
                  <Sparkles size={12} />
                  <span>{specialTitle}</span>
                </div>
                {specialDesc && (
                  <p className="text-xs font-bold text-slate-300 leading-snug mt-0.5">
                    {specialDesc}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mr. Joy First-Exit +4 Bonus Banner (Match Continues!) */}
          {foolBonusTriggered && (
            <div className="w-full bg-amber-500/20 border border-amber-400/50 rounded-2xl p-3 mt-3 text-xs font-black text-amber-200 leading-relaxed">
              {lang === 'ar'
                ? 'حصل Mr. Joy على +4 نقاط إضافية لإقصائه أولاً! (تستمر الجولة حتى يفوز أحد الفريقين)'
                : 'Mr. Joy earned +4 bonus points for first exit! (The match continues)'}
            </div>
          )}

          {/* Lovers Heartbreak Notice */}
          {loversPartnerName && (
            <div className="w-full bg-pink-500/20 border border-pink-400/50 rounded-2xl p-3 mt-3 text-xs font-black text-pink-200 flex items-center justify-center gap-2">
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
          <div className="mb-5 pt-3 border-t border-white/10">
            <p className="text-slate-400 font-bold mb-2.5 text-xs uppercase tracking-widest">
              {t('votedBy')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {voters.map((voter, idx) => (
                <motion.div
                  key={voter.uid || voter.id || idx}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.06 }}
                  className="relative flex flex-col items-center"
                >
                  <Avatar avatar={voter.avatar} name={voter.name} size={38} />
                  <span className="text-[11px] font-bold text-slate-300 mt-0.5 max-w-[58px] truncate">
                    {voter.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {isOnline && !isHost ? (
          <div className="w-full py-3.5 mt-auto rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-sm font-black">
            {t('waitingForHostToContinue')}
          </div>
        ) : (
          <button
            onClick={onNext}
            className={`w-full py-4 mt-auto rounded-2xl text-lg font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              isImpostor && !isSaved
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-sky-500 hover:bg-sky-400 text-white'
            }`}
          >
            <span>
              {isImpostor && !isSaved
                ? lang === 'ar'
                  ? 'فرصة Mr. White للتخمين'
                  : t('doesHeKnowWord')
                : lang === 'ar'
                ? 'موافق'
                : t('ok')}
            </span>
            <ArrowRight size={20} className="rtl:rotate-180" />
          </button>
        )}
      </motion.div>
    </div>
  );
};
