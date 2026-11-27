import React from 'react';
import { Moon, RefreshCw, Scale, UserX } from 'lucide-react';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import { getMafiaRoleLabel } from '../../src/game/mafia/mafiaCatalog';
import { getSettings } from '../../services/storageService';
import {
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedDossierPanel,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaVoteResultScreenProps {
  match: MafiaMatchState;
  onContinue: () => void;
}

export const MafiaVoteResultScreen: React.FC<MafiaVoteResultScreenProps> = ({
  match,
  onContinue,
}) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const record = match.latestVoteRecord;
  if (!record) return null;

  const isRevoteNeeded = record.outcome === 'tie_revote';
  const maxVotes = Math.max(1, record.tally[0]?.count || 1);

  const copy = {
    ar: {
      badge: 'نتيجة التصويت',
      title: `قرار اليوم ${record.dayNumber}`,
      subtitle: 'فرز الأصوات العلني للمدينة',
      removed: `تم إخراج اللاعب من الجولة: ${record.eliminatedPlayerName || ''}`,
      tieRevote: 'تعادل في الأصوات! تُفتح الآن جولة إعادة بين المتعادلين.',
      tieNoElim: 'استمر التعادل أو غابت الأغلبية — لم يخرج أي لاعب هذا اليوم.',
      allAbstain: 'امتنعت الأغلبية عن التصويت — لم يخرج أي لاعب اليوم.',
      revealedRole: 'الدور المكشوف',
      hiddenRole: 'الدور السري محجوب وفق إعدادات الجولة.',
      abstainCount: `أصوات الامتناع: ${record.abstainCount}`,
      continueBtn: isRevoteNeeded ? 'بدء جولة الإعادة' : 'حلول الليل التالي',
    },
    fr: {
      badge: 'RÉSULTAT DU VOTE',
      title: `Verdict du Jour ${record.dayNumber}`,
      subtitle: 'Dépouillement officiel de la Cité',
      removed: `Joueur retiré de la manche : ${record.eliminatedPlayerName || ''}`,
      tieRevote: 'Égalité ! Un second tour s’ouvre entre les joueurs à égalité.',
      tieNoElim: 'Égalité persistante — personne n’est retiré aujourd’hui.',
      allAbstain: 'Majorité d’abstentions — aucune sortie aujourd’hui.',
      revealedRole: 'Rôle révélé',
      hiddenRole: 'Rôle masqué selon les paramètres de partie.',
      abstainCount: `Abstentions : ${record.abstainCount}`,
      continueBtn: isRevoteNeeded ? 'Lancer le second tour' : 'Passer à la nuit suivante',
    },
    en: {
      badge: 'BALLOT VERDICT',
      title: `Day ${record.dayNumber} Tally`,
      subtitle: 'Public city ballot outcome',
      removed: `Removed from round: ${record.eliminatedPlayerName || ''}`,
      tieRevote: 'Tie vote! A runoff ballot now opens between tied candidates.',
      tieNoElim: 'Vote ended in deadlock — nobody was removed today.',
      allAbstain: 'All ballots abstained — no removal today.',
      revealedRole: 'Confirmed Role',
      hiddenRole: 'Role remains redacted per match settings.',
      abstainCount: `Abstentions: ${record.abstainCount}`,
      continueBtn: isRevoteNeeded ? 'Start Tie Runoff Vote' : 'Proceed to Next Night',
    },
  }[langKey];

  const headline =
    record.outcome === 'eliminated'
      ? copy.removed
      : record.outcome === 'tie_revote'
      ? copy.tieRevote
      : record.outcome === 'all_abstain'
      ? copy.allAbstain
      : copy.tieNoElim;

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-2xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="voting" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1 space-y-4">
        <DossierHeaderBand
          accent="crimson"
          texture="paper"
          badge={<ClassifiedStamp tone="crimson">{copy.badge}</ClassifiedStamp>}
          title={copy.title}
          subtitle={copy.subtitle}
          icon={record.eliminatedPlayerId ? <UserX size={20} className="text-danger-text" /> : <Scale size={20} className="text-primary-text" />}
        />

        <ClassifiedDossierPanel className="p-5 text-center space-y-3 border-[#B49A62]/45">
          <h2 className="text-lg sm:text-xl font-extrabold text-text-main">{headline}</h2>
          {record.eliminatedPlayerId && (
            <div>
              {record.eliminatedPlayerRole ? (
                <StatusIndicator tone="crimson">
                  {copy.revealedRole}: {getMafiaRoleLabel(record.eliminatedPlayerRole, lang)}
                </StatusIndicator>
              ) : (
                <p className="text-xs text-text-muted">{copy.hiddenRole}</p>
              )}
            </div>
          )}
        </ClassifiedDossierPanel>

        <IntelligencePanel className="p-4 sm:p-5 space-y-3">
          {record.tally.map((item) => {
            const pct = Math.round((item.count / maxVotes) * 100);
            return (
              <div key={item.targetId} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-main">{item.targetName}</span>
                  <span className="font-mono-code tabular-nums text-danger-text">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-bg-card overflow-hidden">
                  <div
                    className="h-full bg-[#963F46] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {record.abstainCount > 0 && (
            <p className="text-xs font-semibold text-text-muted pt-2 border-t border-border tabular-nums">
              {copy.abstainCount}
            </p>
          )}
        </IntelligencePanel>

        <BottomActionBar className="mt-auto">
          <div className="w-full max-w-md mx-auto">
            <TacticalButton
              variant={isRevoteNeeded ? 'primary' : 'danger'}
              size="lg"
              fullWidth
              onClick={onContinue}
              icon={isRevoteNeeded ? <RefreshCw size={18} /> : <Moon size={18} />}
            >
              {copy.continueBtn}
            </TacticalButton>
          </div>
        </BottomActionBar>
      </div>
    </div>
  );
};
