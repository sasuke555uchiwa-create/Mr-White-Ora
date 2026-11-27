import React, { useEffect, useState } from 'react';
import { MessageSquare, Pause, Play, Scale, ShieldAlert } from 'lucide-react';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import { getSettings } from '../../services/storageService';
import { playSound } from '../../services/soundService';
import { Avatar } from '../Avatar';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  InteractiveCard,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaDiscussionScreenProps {
  match: MafiaMatchState;
  onToggleNomination: (targetId: string) => void;
  onProceedToDefenseOrVoting: () => void;
}

export const MafiaDiscussionScreen: React.FC<MafiaDiscussionScreenProps> = ({
  match,
  onToggleNomination,
  onProceedToDefenseOrVoting,
}) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const isDefense = match.phase === 'defense';
  const initialSeconds = isDefense ? 45 : match.settings.discussionDurationSeconds;

  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setTimeLeft(isDefense ? 45 : match.settings.discussionDurationSeconds);
    setIsPaused(false);
  }, [isDefense, match.dayNumber, match.settings.discussionDurationSeconds]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && prev === 1) playSound('timeUp');
        else if (next > 0 && next <= 5) playSound('tick');
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, timeLeft]);

  const livingPlayers = match.players.filter((p) => p.isAlive);
  const removedPlayers = match.players.filter((p) => !p.isAlive);
  const nominatedPlayers = livingPlayers.filter((p) => match.nominatedPlayerIds.includes(p.id));

  const copy = {
    ar: {
      badge: isDefense ? 'جلسة الدفاع' : `اليوم ${match.dayNumber} · النقاش`,
      title: isDefense ? 'دفاع المرشحين للتصويت' : 'مناقشة المدينة',
      subtitle: isDefense
        ? 'يقدّم كل لاعب مرشح دفاعه الموجز قبل بدء التصويت السري.'
        : 'ناقشوا القرائن ورشّحوا المشتبه بهم إن أردتم قبل فتح التصويت السري.',
      nomHint: match.settings.enableNominationDefense
        ? 'اضغط على اسم أي لاعب لترشيحه لجلسة الدفاع (اختياري):'
        : 'اللاعبون المشاركون في الطاولة:',
      nominated: 'مرشح للدفاع',
      removed: 'خارج الجولة',
      speakerHint: `ترتيب البداية المقترح: ${livingPlayers[match.dayNumber % livingPlayers.length]?.name || ''}`,
      openVoting:
        !isDefense && match.settings.enableNominationDefense && nominatedPlayers.length > 0
          ? `بدء دفاع المرشحين (${nominatedPlayers.length})`
          : 'فتح التصويت السري',
    },
    fr: {
      badge: isDefense ? 'DÉFENSE' : `JOUR ${match.dayNumber} · DÉBAT`,
      title: isDefense ? 'Défense des nominés' : 'Débat de la Cité',
      subtitle: isDefense
        ? 'Chaque nominé dispose d’un court temps de parole avant le vote.'
        : 'Débattez librement et désignez les suspects avant le vote secret.',
      nomHint: match.settings.enableNominationDefense
        ? 'Touchez un joueur pour le nominer pour la défense (optionnel) :'
        : 'Joueurs en vie :',
      nominated: 'Nominé',
      removed: 'Hors manche',
      speakerHint: `Premier orateur suggéré : ${livingPlayers[match.dayNumber % livingPlayers.length]?.name || ''}`,
      openVoting:
        !isDefense && match.settings.enableNominationDefense && nominatedPlayers.length > 0
          ? `Passer à la défense (${nominatedPlayers.length})`
          : 'Ouvrir le vote secret',
    },
    en: {
      badge: isDefense ? 'DEFENSE FLOOR' : `DAY ${match.dayNumber} · DEBATE`,
      title: isDefense ? 'Defense Statements' : 'City Discussion',
      subtitle: isDefense
        ? 'Nominated operatives state their defense briefly before secret ballots open.'
        : 'Compare observations and optionally nominate suspects before secret voting.',
      nomHint: match.settings.enableNominationDefense
        ? 'Tap any living player to nominate for defense (optional):'
        : 'Active operatives at the table:',
      nominated: 'Nominated',
      removed: 'Out',
      speakerHint: `Suggested opening speaker: ${livingPlayers[match.dayNumber % livingPlayers.length]?.name || ''}`,
      openVoting:
        !isDefense && match.settings.enableNominationDefense && nominatedPlayers.length > 0
          ? `Hear Defense (${nominatedPlayers.length})`
          : 'Proceed to Secret Vote',
    },
  }[langKey];

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-3xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="discussion" texture="map" />
      <div className="relative z-10 flex flex-col flex-1 space-y-4">
        <DossierHeaderBand
          accent="cyan"
          texture="map"
          badge={<ClassifiedStamp tone="cyan">{copy.badge}</ClassifiedStamp>}
          title={copy.title}
          subtitle={copy.subtitle}
          icon={isDefense ? <Scale size={20} className="text-primary-text" /> : <MessageSquare size={20} className="text-cyan-text" />}
          action={
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="min-w-[44px] min-h-[44px] px-3 rounded-[10px] bg-bg-card border border-border-strong flex items-center gap-2 font-mono-code font-bold text-sm tabular-nums text-text-main"
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
              <span>
                {mins}:{String(secs).padStart(2, '0')}
              </span>
            </button>
          }
        />

        {!isDefense && (
          <IntelligencePanel className="p-3.5 flex items-center justify-between gap-2 text-xs font-bold text-cyan-text">
            <span>{copy.speakerHint}</span>
            <StatusIndicator tone="cyan">
              <span className="tabular-nums">
                {livingPlayers.length} / {match.players.length}
              </span>
            </StatusIndicator>
          </IntelligencePanel>
        )}

        <IntelligencePanel className="p-4 space-y-3">
          <p className="text-xs font-bold text-text-muted">
            {isDefense ? copy.title : copy.nomHint}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(isDefense ? nominatedPlayers : livingPlayers).map((p) => {
              const isNominated = match.nominatedPlayerIds.includes(p.id);
              return (
                <InteractiveCard
                  key={p.id}
                  selected={isNominated}
                  accent="gold"
                  disabled={isDefense || !match.settings.enableNominationDefense}
                  onClick={() => {
                    if (isDefense || !match.settings.enableNominationDefense) return;
                    onToggleNomination(p.id);
                  }}
                  className="p-3 flex flex-col items-center gap-2 text-center"
                >
                  <Avatar avatar={p.avatar} name={p.name} size={44} />
                  <span className="text-xs font-bold text-text-main truncate max-w-full">
                    {p.name}
                  </span>
                  {isNominated && (
                    <span className="text-[10px] font-bold text-primary-text flex items-center gap-1">
                      <ShieldAlert size={11} />
                      {copy.nominated}
                    </span>
                  )}
                </InteractiveCard>
              );
            })}
          </div>

          {removedPlayers.length > 0 && !isDefense && (
            <div className="pt-3 border-t border-border/70 flex flex-wrap gap-2">
              {removedPlayers.map((rp) => (
                <span
                  key={rp.id}
                  className="px-2.5 py-1 rounded-[8px] bg-bg-card border border-border text-[11px] font-semibold text-text-muted line-through"
                >
                  {rp.name} ({copy.removed})
                </span>
              ))}
            </div>
          )}
        </IntelligencePanel>

        <BottomActionBar className="mt-auto">
          <div className="w-full max-w-md mx-auto">
            <TacticalButton
              variant="danger"
              size="lg"
              fullWidth
              onClick={onProceedToDefenseOrVoting}
              icon={<BlacksiteIcon name="secretVote" size={18} />}
            >
              {copy.openVoting}
            </TacticalButton>
          </div>
        </BottomActionBar>
      </div>
    </div>
  );
};
