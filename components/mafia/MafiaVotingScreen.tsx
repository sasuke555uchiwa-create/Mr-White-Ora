import React, { useMemo, useState } from 'react';
import { Check, MinusCircle, ShieldAlert, Smartphone } from 'lucide-react';
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

interface MafiaVotingScreenProps {
  match: MafiaMatchState;
  onVotingComplete: (votesByVoterId: Record<string, string>) => void;
}

export const MafiaVotingScreen: React.FC<MafiaVotingScreenProps> = ({
  match,
  onVotingComplete,
}) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const livingPlayers = useMemo(() => match.players.filter((p) => p.isAlive), [match.players]);
  const eligibleCandidates = useMemo(() => {
    if (match.revoteCandidateIds && match.revoteCandidateIds.length > 0) {
      return livingPlayers.filter((p) => match.revoteCandidateIds!.includes(p.id));
    }
    return livingPlayers;
  }, [livingPlayers, match.revoteCandidateIds]);

  const [voterIndex, setVoterIndex] = useState(0);
  const [handoffConfirmed, setHandoffConfirmed] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});

  const currentVoter = livingPlayers[voterIndex];
  if (!currentVoter) return null;

  const isLastVoter = voterIndex >= livingPlayers.length - 1;

  const copy = {
    ar: {
      badge: match.isRevote ? 'جولة إعادة التصويت' : `تصويت اليوم ${match.dayNumber}`,
      title: match.isRevote ? 'إعادة التصويت على المتعادلين' : 'التصويت السري للمدينة',
      subtitle: 'صوت واحد سري لكل لاعب حي لتحديد من يخرج من الجولة.',
      passTo: `مرر الجهاز إلى ${currentVoter.name}`,
      privacyNote: 'تأكد من سرية الشاشة قبل الإدلاء بصوتك.',
      unlockVote: `أنا ${currentVoter.name} — افتح بطاقة التصويت`,
      chooseSuspect: 'اختر اللاعب المراد إخراجه من الجولة:',
      abstain: 'امتناع عن التصويت',
      confirmVote: isLastVoter ? 'تأكيد وإظهار نتيجة التصويت' : 'تأكيد الصوت وإخفاء الشاشة',
      progress: `${voterIndex + 1} / ${livingPlayers.length}`,
    },
    fr: {
      badge: match.isRevote ? 'SECOND TOUR' : `VOTE JOUR ${match.dayNumber}`,
      title: match.isRevote ? 'Départage des ex æquo' : 'Vote Secret de la Cité',
      subtitle: 'Un bulletin secret par joueur vivant.',
      passTo: `Passez l’appareil à ${currentVoter.name}`,
      privacyNote: 'Vérifiez que personne ne voit votre écran avant de voter.',
      unlockVote: `Je suis ${currentVoter.name} — Voter`,
      chooseSuspect: 'Choisissez le joueur à retirer de la manche :',
      abstain: 'S’abstenir',
      confirmVote: isLastVoter ? 'Valider et afficher le résultat' : 'Valider et passer au suivant',
      progress: `${voterIndex + 1} / ${livingPlayers.length}`,
    },
    en: {
      badge: match.isRevote ? 'TIE REVOTE' : `DAY ${match.dayNumber} BALLOT`,
      title: match.isRevote ? 'Runoff Secret Ballot' : 'Secret City Ballot',
      subtitle: 'One private ballot per living operative.',
      passTo: `Pass device to ${currentVoter.name}`,
      privacyNote: 'Ensure no one else is watching before unlocking your ballot.',
      unlockVote: `I am ${currentVoter.name} — Open Ballot`,
      chooseSuspect: 'Select who should be removed from this round:',
      abstain: 'Abstain Vote',
      confirmVote: isLastVoter ? 'Seal Final Ballot & Reveal Tally' : 'Lock Ballot & Pass Next',
      progress: `${voterIndex + 1} / ${livingPlayers.length}`,
    },
  }[langKey];

  const handleConfirmBallot = () => {
    if (!selectedTarget) return;
    playSound('voteConfirm');
    const updatedVotes = {
      ...votes,
      [currentVoter.id]: selectedTarget,
    };
    setVotes(updatedVotes);
    setSelectedTarget(null);
    setHandoffConfirmed(false);

    if (isLastVoter) {
      onVotingComplete(updatedVotes);
    } else {
      setVoterIndex((idx) => idx + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-2xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="voting" texture="carbon" />
      <div className="relative z-10 flex flex-col flex-1">
        <DossierHeaderBand
          accent="crimson"
          texture="carbon"
          className="mb-4"
          badge={<ClassifiedStamp tone="crimson">{copy.badge}</ClassifiedStamp>}
          title={copy.title}
          subtitle={copy.subtitle}
          icon={<BlacksiteIcon name="secretVote" size={20} />}
          action={
            <StatusIndicator tone="crimson">
              <span className="tabular-nums">{copy.progress}</span>
            </StatusIndicator>
          }
        />

        {!handoffConfirmed ? (
          <IntelligencePanel className="my-auto p-6 sm:p-8 text-center space-y-5 border-[#963F46]/45">
            <Avatar avatar={currentVoter.avatar} name={currentVoter.name} size={78} className="mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-text-main">{copy.passTo}</h2>
              <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
                <ShieldAlert size={15} className="text-danger-text shrink-0" />
                <span>{copy.privacyNote}</span>
              </p>
            </div>
            <TacticalButton
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => {
                playSound('handoff');
                setHandoffConfirmed(true);
              }}
              icon={<Smartphone size={18} />}
            >
              {copy.unlockVote}
            </TacticalButton>
          </IntelligencePanel>
        ) : (
          <div className="flex flex-col flex-1 space-y-4">
            <IntelligencePanel className="p-4 sm:p-5 space-y-4 border-[#963F46]/45">
              <p className="text-xs font-bold text-text-muted">{copy.chooseSuspect}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {eligibleCandidates
                  .filter((cand) => cand.id !== currentVoter.id)
                  .map((cand) => {
                    const selected = selectedTarget === cand.id;
                    return (
                      <InteractiveCard
                        key={cand.id}
                        selected={selected}
                        accent="crimson"
                        onClick={() => {
                          playSound('click');
                          setSelectedTarget(cand.id);
                        }}
                        className="p-3 flex flex-col items-center gap-2"
                      >
                        <Avatar avatar={cand.avatar} name={cand.name} size={44} />
                        <span className="text-xs font-bold text-text-main truncate max-w-full">
                          {cand.name}
                        </span>
                      </InteractiveCard>
                    );
                  })}
              </div>

              {match.settings.allowAbstention && (
                <InteractiveCard
                  selected={selectedTarget === 'ABSTAIN'}
                  accent="cyan"
                  onClick={() => {
                    playSound('click');
                    setSelectedTarget('ABSTAIN');
                  }}
                  className="w-full p-3 flex items-center justify-center gap-2 text-xs font-bold text-cyan-text"
                >
                  <MinusCircle size={15} />
                  <span>{copy.abstain}</span>
                </InteractiveCard>
              )}
            </IntelligencePanel>

            <BottomActionBar className="mt-auto">
              <div className="w-full max-w-md mx-auto">
                <TacticalButton
                  variant="danger"
                  size="lg"
                  fullWidth
                  disabled={!selectedTarget}
                  onClick={handleConfirmBallot}
                  icon={<Check size={18} />}
                >
                  {copy.confirmVote}
                </TacticalButton>
              </div>
            </BottomActionBar>
          </div>
        )}
      </div>
    </div>
  );
};
