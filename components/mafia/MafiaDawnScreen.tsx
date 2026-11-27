import React from 'react';
import { ShieldCheck, Sun, UserX } from 'lucide-react';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import { getMafiaRoleLabel } from '../../src/game/mafia/mafiaCatalog';
import { getSettings } from '../../services/storageService';
import {
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedDossierPanel,
  ClassifiedStamp,
  DossierHeaderBand,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaDawnScreenProps {
  match: MafiaMatchState;
  onContinue: () => void;
}

export const MafiaDawnScreen: React.FC<MafiaDawnScreenProps> = ({ match, onContinue }) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const report = match.latestDawnReport;
  if (!report) return null;

  const aliveCount = match.players.filter((p) => p.isAlive).length;

  const copy = {
    ar: {
      badge: 'تقرير الفجر',
      title: report.isOpeningNight ? 'استيقظت المدينة بأمان' : `فجر اليوم ${match.dayNumber + 1}`,
      subtitle: 'النتيجة العلنية لأحداث الليل',
      openingHeadline: 'تم تنسيق المافيا في الظلال دون إخراج أي لاعب.',
      openingDesc: 'الجميع على طاولة النقاش الآن. تبدأ القدرات الليلية الكاملة في الليلة القادمة.',
      savedHeadline: 'نجح الطبيب الميداني في إحباط هجوم الليل!',
      savedDesc: 'تم صدّ محاولة الإخراج الليلية بالكامل وعاد الجميع إلى الفجر.',
      peacefulHeadline: 'مرّت الليلة دون إخراج أي لاعب.',
      removedHeadline: `إخراج اللاعب من الجولة: ${report.eliminatedPlayerName || ''}`,
      removedDesc: 'استُبعد هذا اللاعب من التواجد الليلي والنهاري في مدينة الظلال.',
      revealedRole: 'الدور المكشوف',
      hiddenRole: 'الدور السري بقي محجوباً حسب إعدادات الجولة.',
      aliveRemaining: `اللاعبون المتبقون: ${aliveCount}`,
      continueBtn: 'فتح جلسة النقاش',
    },
    fr: {
      badge: 'RAPPORT DE L’AUBE',
      title: report.isOpeningNight ? 'La cité s’éveille au complet' : `Aube du Jour ${match.dayNumber + 1}`,
      subtitle: 'Bilan public de la nuit',
      openingHeadline: 'La Mafia s’est coordonnée sans aucune sortie cette nuit.',
      openingDesc: 'Tout le monde participe au premier débat. Les pouvoirs nocturnes commencent la nuit suivante.',
      savedHeadline: 'Le Médecin a bloqué l’opération nocturne !',
      savedDesc: 'La protection médicale a sauvé la cible de la nuit.',
      peacefulHeadline: 'Nuit calme — aucun joueur retiré de la manche.',
      removedHeadline: `Joueur retiré de la manche : ${report.eliminatedPlayerName || ''}`,
      removedDesc: 'Ce joueur quitte la table pour le reste de l’opération.',
      revealedRole: 'Rôle révélé',
      hiddenRole: 'Le rôle reste secret selon les règles choisies.',
      aliveRemaining: `Joueurs actifs : ${aliveCount}`,
      continueBtn: 'Ouvrir le débat',
    },
    en: {
      badge: 'DAWN REPORT',
      title: report.isOpeningNight ? 'City Awakens' : `Dawn · Day ${match.dayNumber + 1}`,
      subtitle: 'Public overnight outcome',
      openingHeadline: 'The syndicate coordinated in the shadows with zero removals.',
      openingDesc: 'All operatives enter Day 1 debate. Full night actions activate from Night 1 onward.',
      savedHeadline: 'Medical Shield Blocked the Night Strike!',
      savedDesc: 'The Doctor intercepted tonight’s target and kept everyone in the round.',
      peacefulHeadline: 'Quiet Night — No operative removed.',
      removedHeadline: `Removed from round: ${report.eliminatedPlayerName || ''}`,
      removedDesc: 'This operative has been removed from active play in Shadow City.',
      revealedRole: 'Confirmed Role',
      hiddenRole: 'Role remains redacted per match settings.',
      aliveRemaining: `Active Operatives: ${aliveCount}`,
      continueBtn: 'Open Morning Discussion',
    },
  }[langKey];

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-2xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="briefing" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1">
        <DossierHeaderBand
          accent="gold"
          texture="paper"
          className="mb-4"
          badge={<ClassifiedStamp tone="gold">{copy.badge}</ClassifiedStamp>}
          title={copy.title}
          subtitle={copy.subtitle}
          icon={<Sun size={20} className="text-primary-text" />}
          action={
            <StatusIndicator tone="cyan">
              <span className="tabular-nums">{copy.aliveRemaining}</span>
            </StatusIndicator>
          }
        />

        <ClassifiedDossierPanel className="my-auto p-6 sm:p-8 text-center space-y-4 border-[#B49A62]/45">
          <div className="w-16 h-16 rounded-[14px] bg-[#080B10] border border-border-strong flex items-center justify-center mx-auto">
            {report.eliminatedPlayerId ? (
              <UserX size={30} className="text-danger-text" />
            ) : report.wasSavedByDoctor ? (
              <ShieldCheck size={30} className="text-emerald-text" />
            ) : (
              <Sun size={30} className="text-primary-text" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-text-main">
            {report.isOpeningNight
              ? copy.openingHeadline
              : report.eliminatedPlayerId
              ? copy.removedHeadline
              : report.wasSavedByDoctor
              ? copy.savedHeadline
              : copy.peacefulHeadline}
          </h2>

          <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            {report.isOpeningNight
              ? copy.openingDesc
              : report.eliminatedPlayerId
              ? copy.removedDesc
              : report.wasSavedByDoctor
              ? copy.savedDesc
              : copy.openingDesc}
          </p>

          {report.eliminatedPlayerId && (
            <div className="pt-2">
              {report.eliminatedPlayerRole ? (
                <StatusIndicator tone="crimson">
                  {copy.revealedRole}: {getMafiaRoleLabel(report.eliminatedPlayerRole, lang)}
                </StatusIndicator>
              ) : (
                <p className="text-xs text-text-muted">{copy.hiddenRole}</p>
              )}
            </div>
          )}
        </ClassifiedDossierPanel>

        <BottomActionBar className="mt-auto">
          <div className="w-full max-w-md mx-auto">
            <TacticalButton variant="primary" size="lg" fullWidth onClick={onContinue}>
              {copy.continueBtn}
            </TacticalButton>
          </div>
        </BottomActionBar>
      </div>
    </div>
  );
};
