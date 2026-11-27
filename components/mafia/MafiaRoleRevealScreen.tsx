import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, Smartphone, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import { getMafiaTeammatesForPlayer } from '../../src/game/mafia/mafiaEngine';
import { getMafiaRoleLabel, getMafiaRoleMeta } from '../../src/game/mafia/mafiaCatalog';
import { getSettings } from '../../services/storageService';
import { playSound } from '../../services/soundService';
import { Avatar } from '../Avatar';
import {
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedDossierPanel,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  OperationPhaseBadge,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaRoleRevealScreenProps {
  match: MafiaMatchState;
  onComplete: () => void;
}

export const MafiaRoleRevealScreen: React.FC<MafiaRoleRevealScreenProps> = ({
  match,
  onComplete,
}) => {
  const [playerIndex, setPlayerIndex] = useState(0);
  const [handoffConfirmed, setHandoffConfirmed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);

  const player = match.players[playerIndex];
  if (!player) return null;

  const roleMeta = getMafiaRoleMeta(player.role);
  const roleLabel = getMafiaRoleLabel(player.role, lang);
  const teammates = getMafiaTeammatesForPlayer(match.players, player.id);
  const isLastPlayer = playerIndex >= match.players.length - 1;
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const copy = {
    ar: {
      phase: 'توزيع الملفات السرية',
      handoffTitle: `مرر الجهاز إلى ${player.name}`,
      handoffDesc: 'تأكد من عدم نظر أي لاعب آخر إلى الشاشة قبل فتح ملفك السري.',
      confirmIdentity: `أنا ${player.name} — افتح ملفي`,
      tapReveal: 'اضغط لكشف دورك السري',
      yourRole: 'دورك السري في مدينة الظلال',
      teammatesTitle: 'أعضاء فريق المافيا معك',
      soloMafia: 'أنت عضو المافيا الوحيد في هذه الجولة.',
      hideAndNext: isLastPlayer ? 'إغلاق الملف وبدء الليل الافتتاحي' : 'إخفاء الملف وتمرير الجهاز',
      progress: `${playerIndex + 1} / ${match.players.length}`,
    },
    fr: {
      phase: 'DISTRIBUTION CONFIDENTIELLE',
      handoffTitle: `Passez l’appareil à ${player.name}`,
      handoffDesc: 'Vérifiez que personne ne regarde l’écran avant d’ouvrir votre dossier.',
      confirmIdentity: `Je suis ${player.name} — Ouvrir`,
      tapReveal: 'Touchez pour révéler votre rôle',
      yourRole: 'Votre rôle secret',
      teammatesTitle: 'Vos alliés de la Mafia',
      soloMafia: 'Vous êtes le seul membre de la Mafia dans cette manche.',
      hideAndNext: isLastPlayer ? 'Masquer et lancer la nuit 0' : 'Masquer et passer au suivant',
      progress: `${playerIndex + 1} / ${match.players.length}`,
    },
    en: {
      phase: 'CONFIDENTIAL ROLE BRIEFING',
      handoffTitle: `Pass device to ${player.name}`,
      handoffDesc: 'Ensure nobody else can view the screen before unsealing your dossier.',
      confirmIdentity: `I am ${player.name} — Unseal Dossier`,
      tapReveal: 'Tap to unseal secret role',
      yourRole: 'Your Shadow City Assignment',
      teammatesTitle: 'Mafia Syndicate Teammates',
      soloMafia: 'You are the sole Mafia operative in this match.',
      hideAndNext: isLastPlayer ? 'Seal Dossier & Begin Opening Night' : 'Seal & Pass Next',
      progress: `${playerIndex + 1} / ${match.players.length}`,
    },
  };
  const c = copy[langKey];

  const handleAdvance = () => {
    playSound('handoff');
    setIsRevealed(false);
    setHandoffConfirmed(false);
    if (isLastPlayer) {
      onComplete();
    } else {
      setPlayerIndex((idx) => idx + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-2xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="briefing" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <OperationPhaseBadge phase="briefing" lang={lang} />
          <StatusIndicator tone="gold" icon={<Users size={12} />}>
            <span className="tabular-nums">{c.progress}</span>
          </StatusIndicator>
        </div>

        {!handoffConfirmed ? (
          <IntelligencePanel className="my-auto p-6 sm:p-8 text-center space-y-5 border-[#B49A62]/40">
            <div className="flex justify-center">
              <ClassifiedStamp tone="gold">{c.phase}</ClassifiedStamp>
            </div>
            <div className="mx-auto flex justify-center">
              <Avatar avatar={player.avatar} name={player.name} size={84} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">
                {c.handoffTitle}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed flex items-center justify-center gap-2">
                <ShieldAlert size={16} className="text-primary-text shrink-0" />
                <span>{c.handoffDesc}</span>
              </p>
            </div>
            <TacticalButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                playSound('dossierOpen');
                setHandoffConfirmed(true);
              }}
              icon={<Smartphone size={18} />}
            >
              {c.confirmIdentity}
            </TacticalButton>
          </IntelligencePanel>
        ) : !isRevealed ? (
          <ClassifiedDossierPanel className="my-auto p-6 sm:p-8 text-center space-y-5 border-[#B49A62]/50">
            <ClassifiedStamp tone="crimson">EYES ONLY</ClassifiedStamp>
            <div className="w-20 h-20 rounded-[14px] bg-[#080B10] border border-[#B49A62]/45 flex items-center justify-center mx-auto">
              <Lock size={34} className="text-primary-text" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-text-main">{player.name}</h3>
              <p className="text-xs text-text-muted mt-1">{c.tapReveal}</p>
            </div>
            <TacticalButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                playSound('roleReveal');
                setIsRevealed(true);
              }}
              icon={<Eye size={18} />}
            >
              {c.tapReveal}
            </TacticalButton>
          </ClassifiedDossierPanel>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1"
          >
            <ClassifiedDossierPanel className="p-5 sm:p-6 space-y-4 border-[#B49A62]/55 text-center my-auto">
              <div className="flex items-center justify-between">
                <ClassifiedStamp tone={roleMeta.tone === 'emerald' ? 'cyan' : roleMeta.tone}>
                  {roleMeta.stamps[langKey]}
                </ClassifiedStamp>
                <span className="text-xs font-mono-code font-bold text-text-muted">{player.name}</span>
              </div>

              <div className="w-28 h-28 rounded-[14px] overflow-hidden border border-[#B49A62]/50 mx-auto bg-[#080B10]">
                <img
                  src={roleMeta.portrait}
                  alt={roleLabel}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-text-muted">{c.yourRole}</p>
                <h2 className="text-2xl font-extrabold text-text-main mt-0.5">{roleLabel}</h2>
              </div>

              <p className="text-xs sm:text-sm text-text-muted leading-relaxed bg-bg-card border border-border rounded-[10px] p-3.5 text-start">
                {roleMeta.descriptions[langKey]}
              </p>

              {/* Mafia Teammates Revealed Privately ONLY to Mafia Faction */}
              {player.faction === 'mafia' && (
                <div className="rounded-[12px] bg-[#963F46]/12 border border-[#963F46]/45 p-3.5 text-start space-y-2">
                  <p className="text-xs font-extrabold text-danger-text">{c.teammatesTitle}</p>
                  {teammates.length === 0 ? (
                    <p className="text-xs text-text-muted">{c.soloMafia}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {teammates.map((mate) => (
                        <div
                          key={mate.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-bg-surface border border-[#963F46]/35"
                        >
                          <Avatar avatar={mate.avatar} name={mate.name} size={24} />
                          <span className="text-xs font-bold text-text-main">{mate.name}</span>
                          {mate.role === 'mafia_boss' && (
                            <ClassifiedStamp tone="gold">BOSS</ClassifiedStamp>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ClassifiedDossierPanel>

            <BottomActionBar className="mt-auto">
              <div className="w-full max-w-md mx-auto">
                <TacticalButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={handleAdvance}
                  icon={<EyeOff size={18} />}
                >
                  {c.hideAndNext}
                </TacticalButton>
              </div>
            </BottomActionBar>
          </motion.div>
        )}

        {/* Hidden summary header spacer for alignment */}
        {!handoffConfirmed && (
          <DossierHeaderBand
            className="hidden"
            title=""
          />
        )}
      </div>
    </div>
  );
};
