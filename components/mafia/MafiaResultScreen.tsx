import React from 'react';
import { Award, CheckCircle2, FileText, Home, RefreshCw, Shield, Skull } from 'lucide-react';
import { ClassifiedCaseFile } from '../../types';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import { getMafiaRoleLabel, getMafiaRoleMeta } from '../../src/game/mafia/mafiaCatalog';
import { getSettings } from '../../services/storageService';
import { Avatar } from '../Avatar';
import {
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedDossierPanel,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaResultScreenProps {
  match: MafiaMatchState;
  caseFile: ClassifiedCaseFile | null;
  onOpenCaseFile?: () => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const MafiaResultScreen: React.FC<MafiaResultScreenProps> = ({
  match,
  caseFile,
  onOpenCaseFile,
  onPlayAgain,
  onGoHome,
}) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const cityWon = match.winner === 'city';
  const durationSec = match.endedAtMs
    ? Math.max(0, Math.round((match.endedAtMs - match.startedAtMs) / 1000))
    : 0;

  const copy = {
    ar: {
      badge: 'الحكم النهائي',
      title: cityWon ? 'انتصار فريق المدينة!' : 'سيطرة المافيا على المدينة!',
      subtitle:
        match.winReason === 'all_mafia_eliminated'
          ? 'تم كشف وإخراج جميع أعضاء المافيا من مدينة الظلال.'
          : 'وصلت المافيا إلى التكافؤ العددي مع المدينة.',
      finalIncidentNight: match.latestDawnReport?.eliminatedPlayerName
        ? `الحدث الحاسم ليلاً: إخراج ${match.latestDawnReport.eliminatedPlayerName}`
        : null,
      finalIncidentVote: match.latestVoteRecord?.eliminatedPlayerName
        ? `التصويت الحاسم: إخراج ${match.latestVoteRecord.eliminatedPlayerName}`
        : null,
      days: `الأيام: ${match.dayNumber}`,
      nights: `الليالي: ${match.nightNumber}`,
      duration: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
      rosterTitle: 'كشف جميع الأدوار السرية',
      alive: 'ناجٍ',
      removed: 'خرج من الجولة',
      viewCaseFile: 'عرض ملف القضية الكامل',
      playAgain: 'العب جولة جديدة',
      home: 'الرئيسية',
    },
    fr: {
      badge: 'VERDICT FINAL',
      title: cityWon ? 'Victoire de la Cité !' : 'Victoire de la Mafia !',
      subtitle:
        match.winReason === 'all_mafia_eliminated'
          ? 'Tous les membres de la Mafia ont été éliminés.'
          : 'La Mafia a atteint la parité numérique avec la Cité.',
      finalIncidentNight: match.latestDawnReport?.eliminatedPlayerName
        ? `Incident décisif de la nuit : ${match.latestDawnReport.eliminatedPlayerName} retiré`
        : null,
      finalIncidentVote: match.latestVoteRecord?.eliminatedPlayerName
        ? `Vote décisif : ${match.latestVoteRecord.eliminatedPlayerName} retiré`
        : null,
      days: `Jours : ${match.dayNumber}`,
      nights: `Nuits : ${match.nightNumber}`,
      duration: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
      rosterTitle: 'Révélation complète des rôles',
      alive: 'Survivant',
      removed: 'Retiré',
      viewCaseFile: 'Ouvrir le Dossier d’Enquête',
      playAgain: 'Rejouer',
      home: 'Accueil',
    },
    en: {
      badge: 'FINAL VERDICT',
      title: cityWon ? 'CITY VICTORY' : 'MAFIA VICTORY',
      subtitle:
        match.winReason === 'all_mafia_eliminated'
          ? 'All Syndicate members were identified and removed.'
          : 'The Syndicate reached numerical parity over the City.',
      finalIncidentNight: match.latestDawnReport?.eliminatedPlayerName
        ? `Deciding Night Outcome: ${match.latestDawnReport.eliminatedPlayerName} removed`
        : null,
      finalIncidentVote: match.latestVoteRecord?.eliminatedPlayerName
        ? `Deciding Vote Outcome: ${match.latestVoteRecord.eliminatedPlayerName} removed`
        : null,
      days: `Days: ${match.dayNumber}`,
      nights: `Nights: ${match.nightNumber}`,
      duration: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
      rosterTitle: 'Full Classified Role Reveal',
      alive: 'Survived',
      removed: 'Removed',
      viewCaseFile: 'Open Mafia Case File',
      playAgain: 'Play Again',
      home: 'Home',
    },
  }[langKey];

  const decidingNote =
    match.winReason === 'mafia_parity_reached' && copy.finalIncidentNight
      ? copy.finalIncidentNight
      : copy.finalIncidentVote || copy.finalIncidentNight;

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-4xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="results" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1 space-y-4">
        <DossierHeaderBand
          accent={cityWon ? 'cyan' : 'crimson'}
          texture="paper"
          badge={<ClassifiedStamp tone={cityWon ? 'cyan' : 'crimson'}>{copy.badge}</ClassifiedStamp>}
          title={copy.title}
          subtitle={copy.subtitle}
          icon={cityWon ? <Shield size={20} className="text-cyan-text" /> : <Skull size={20} className="text-danger-text" />}
        />

        <ClassifiedDossierPanel className="p-4 sm:p-5 space-y-3 border-[#B49A62]/45">
          {decidingNote && (
            <p className="text-xs font-bold text-primary-text text-center bg-[#B49A62]/10 border border-[#B49A62]/30 rounded-[8px] py-2 px-3">
              {decidingNote}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2.5 text-center font-mono-code tabular-nums">
            <div className="p-2.5 rounded-[10px] bg-bg-card border border-border">
              <p className="text-xs text-text-muted">{copy.days}</p>
            </div>
            <div className="p-2.5 rounded-[10px] bg-bg-card border border-border">
              <p className="text-xs text-text-muted">{copy.nights}</p>
            </div>
            <div className="p-2.5 rounded-[10px] bg-bg-card border border-border">
              <p className="text-xs text-primary-text font-bold">{copy.duration}</p>
            </div>
          </div>
        </ClassifiedDossierPanel>

        <IntelligencePanel className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text-main flex items-center gap-2">
              <Award size={16} className="text-primary-text" />
              <span>{copy.rosterTitle}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {match.players.map((p) => {
              const meta = getMafiaRoleMeta(p.role);
              const won = p.faction === match.winner;
              return (
                <PlayerIntelligenceCard
                  key={p.id}
                  className={`p-3 flex items-center justify-between gap-3 ${
                    won ? 'border-[#3E7B67]/50 bg-[#3E7B67]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar avatar={p.avatar} name={p.name} size={40} />
                    <div className="min-w-0 text-start">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-text-main truncate">{p.name}</span>
                        {won && <CheckCircle2 size={13} className="text-emerald-text shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img
                          src={meta.portrait}
                          alt={getMafiaRoleLabel(p.role, lang)}
                          className="w-4 h-4 rounded-[4px] object-cover"
                        />
                        <span
                          className={`text-xs font-bold ${
                            p.faction === 'mafia' ? 'text-danger-text' : 'text-cyan-text'
                          }`}
                        >
                          {getMafiaRoleLabel(p.role, lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <StatusIndicator tone={p.isAlive ? 'emerald' : 'neutral'}>
                    {p.isAlive ? copy.alive : copy.removed}
                  </StatusIndicator>
                </PlayerIntelligenceCard>
              );
            })}
          </div>
        </IntelligencePanel>

        <BottomActionBar className="mt-auto">
          <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-2.5">
            {caseFile && onOpenCaseFile && (
              <TacticalButton
                variant="cyan"
                size="md"
                onClick={onOpenCaseFile}
                className="flex-1"
                icon={<FileText size={16} />}
              >
                {copy.viewCaseFile}
              </TacticalButton>
            )}
            <TacticalButton
              variant="primary"
              size="md"
              onClick={onPlayAgain}
              className="flex-1"
              icon={<RefreshCw size={16} />}
            >
              {copy.playAgain}
            </TacticalButton>
            <TacticalButton
              variant="secondary"
              size="md"
              onClick={onGoHome}
              icon={<Home size={16} />}
            >
              {copy.home}
            </TacticalButton>
          </div>
        </BottomActionBar>
      </div>
    </div>
  );
};
