import React, { useMemo, useState } from 'react';
import { ChevronLeft, Shield, Stethoscope, Search, Crown, Scale, Users } from 'lucide-react';
import { getSettings } from '../../services/storageService';
import { getDefaultMafiaSettings, getRecommendedMafiaPreset } from '../../src/game/mafia/mafiaEngine';
import { MafiaSettings, MafiaTieRule } from '../../src/game/mafia/mafiaTypes';
import { MAFIA_ROLE_CATALOG } from '../../src/game/mafia/mafiaCatalog';
import { playSound } from '../../services/soundService';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  InteractiveCard,
  SegmentedControl,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaSettingsScreenProps {
  playersCount: number;
  onStart: (settings: MafiaSettings) => void;
  onBack: () => void;
  onEditPlayers?: () => void;
}

export const MafiaSettingsScreen: React.FC<MafiaSettingsScreenProps> = ({
  playersCount,
  onStart,
  onBack,
  onEditPlayers,
}) => {
  const appSettings = getSettings();
  const lang = appSettings.language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);

  const defaults = useMemo(() => getDefaultMafiaSettings(playersCount), [playersCount]);

  const [mafiaCount, setMafiaCount] = useState<number>(defaults.mafiaCount);
  const [enableDetective, setEnableDetective] = useState<boolean>(defaults.enableDetective);
  const [enableDoctor, setEnableDoctor] = useState<boolean>(defaults.enableDoctor);
  const [enableMafiaBoss, setEnableMafiaBoss] = useState<boolean>(defaults.enableMafiaBoss);
  const [doctorAllowConsecutive, setDoctorAllowConsecutive] = useState<boolean>(
    defaults.doctorAllowConsecutiveProtection
  );
  const [discussionDurationSeconds, setDiscussionDurationSeconds] = useState<number>(
    defaults.discussionDurationSeconds
  );
  const [votingDurationSeconds, setVotingDurationSeconds] = useState<number>(
    defaults.votingDurationSeconds
  );
  const [enableNominationDefense, setEnableNominationDefense] = useState<boolean>(
    defaults.enableNominationDefense
  );
  const [revealRoleOnExit, setRevealRoleOnExit] = useState<boolean>(defaults.revealRoleOnExit);
  const [tieRule, setTieRule] = useState<MafiaTieRule>(defaults.tieRule);
  const [allowAbstention, setAllowAbstention] = useState<boolean>(defaults.allowAbstention);

  const preset = useMemo(
    () =>
      getRecommendedMafiaPreset(playersCount, {
        mafiaCount,
        enableDetective,
        enableDoctor,
        enableMafiaBoss,
      }),
    [playersCount, mafiaCount, enableDetective, enableDoctor, enableMafiaBoss]
  );

  const maxAllowedMafia = Math.max(1, Math.floor((playersCount - 1) / 2));

  const copy = {
    ar: {
      badge: 'SHADOW CITY',
      title: 'إعدادات مافيا: مدينة الظلال',
      subtitle: `${playersCount} عملاء مسجلون · وضع التمرير المحلي`,
      editPlayers: 'تعديل الأسماء',
      factions: 'توازن الأدوار',
      mafiaTeam: 'فريق المافيا',
      cityTeam: 'فريق المدينة',
      citizens: 'المواطنون',
      detective: 'المحقق السري',
      doctor: 'الطبيب الميداني',
      boss: 'زعيم المافيا',
      bossHint: 'يظهر للمحقق كعضو مدينة عند الفحص الليلي',
      doctorRule: 'حماية نفس الشخص ليلتين متتاليتين',
      allowed: 'مسموح',
      blocked: 'ممنوع (قياسي)',
      discussionTimer: 'مدة النقاش الصباحي',
      votingTimer: 'مدة التصويت السري',
      nominationDefense: 'الترشيح والدفاع قبل التصويت',
      revealOnExit: 'كشف الدور عند خروج اللاعب',
      tieRuleLabel: 'عند تعادل الأصوات',
      revote: 'جولة إعادة',
      noElim: 'لا إقصاء',
      abstention: 'السماح بالامتناع عن التصويت',
      startMafia: 'بدء المهمة السرية',
      invalidCount: 'يتطلب هذا الطور 6 إلى 14 لاعباً.',
      enabled: 'مُفعّل',
      disabled: 'معطّل',
    },
    fr: {
      badge: 'SHADOW CITY',
      title: 'Mafia : Cité des Ombres',
      subtitle: `${playersCount} joueurs · Passe & Joue local`,
      editPlayers: 'Modifier joueurs',
      factions: 'Équilibre des rôles',
      mafiaTeam: 'Camp Mafia',
      cityTeam: 'Camp Cité',
      citizens: 'Citoyens',
      detective: 'Détective',
      doctor: 'Médecin',
      boss: 'Parrain',
      bossHint: 'Apparaît comme Citoyen lors de l’enquête nocturne',
      doctorRule: 'Protéger la même cible deux nuits de suite',
      allowed: 'Autorisé',
      blocked: 'Interdit (Standard)',
      discussionTimer: 'Durée du débat',
      votingTimer: 'Durée du vote',
      nominationDefense: 'Nomination & défense avant vote',
      revealOnExit: 'Révéler le rôle à la sortie',
      tieRuleLabel: 'En cas d’égalité',
      revote: 'Second tour',
      noElim: 'Aucune sortie',
      abstention: 'Autoriser l’abstention',
      startMafia: 'Lancer la partie',
      invalidCount: 'Ce mode nécessite entre 6 et 14 joueurs.',
      enabled: 'Actif',
      disabled: 'Inactif',
    },
    en: {
      badge: 'SHADOW CITY',
      title: 'Mafia Setup',
      subtitle: `${playersCount} Operatives · Pass & Play`,
      editPlayers: 'Edit Players',
      factions: 'Faction Balance',
      mafiaTeam: 'Mafia Team',
      cityTeam: 'City Team',
      citizens: 'Citizens',
      detective: 'Detective',
      doctor: 'Doctor',
      boss: 'Mafia Boss',
      bossHint: 'Appears as City when investigated by Detective',
      doctorRule: 'Consecutive night protection on same target',
      allowed: 'Allowed',
      blocked: 'Blocked (Standard)',
      discussionTimer: 'Discussion Duration',
      votingTimer: 'Voting Duration',
      nominationDefense: 'Nomination & Defense Phase',
      revealOnExit: 'Reveal role upon exit',
      tieRuleLabel: 'Tie Resolution Rule',
      revote: 'Revote',
      noElim: 'No Removal',
      abstention: 'Allow abstention ballot',
      startMafia: 'Begin Shadow City',
      invalidCount: 'Mafia requires 6 to 14 players.',
      enabled: 'Enabled',
      disabled: 'Disabled',
    },
  };
  const c = isRTL ? copy.ar : lang === 'fr' ? copy.fr : copy.en;

  const handleLaunch = () => {
    if (!preset.isValid) return;
    onStart({
      mafiaCount: preset.mafiaCount,
      enableDetective,
      enableDoctor,
      enableMafiaBoss,
      doctorAllowConsecutiveProtection: doctorAllowConsecutive,
      discussionDurationSeconds,
      votingDurationSeconds,
      enableNominationDefense,
      revealRoleOnExit,
      tieRule,
      allowAbstention,
    });
  };

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-4 pb-0 max-w-5xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="setup" texture="map" />
      <div className="relative z-10 flex flex-col flex-1">
        <DossierHeaderBand
          accent="crimson"
          texture="map"
          className="mb-4"
          badge={<ClassifiedStamp tone="crimson">{c.badge}</ClassifiedStamp>}
          title={c.title}
          subtitle={c.subtitle}
          icon={<Users size={20} className="text-danger-text" />}
          action={
            <TacticalButton
              variant="secondary"
              size="sm"
              onClick={onEditPlayers || onBack}
              trailingIcon={<ChevronLeft size={14} className="ltr:rotate-180" />}
            >
              {c.editPlayers}
            </TacticalButton>
          }
        />

        {!preset.isValid && (
          <div className="mb-4 p-3.5 rounded-[12px] bg-[#963F46]/15 border border-[#963F46]/50 text-danger-text text-xs font-bold text-center">
            {c.invalidCount}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start mb-6">
          {/* Left Column: Roles & Factions */}
          <div className="space-y-4">
            <IntelligencePanel className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                <h3 className="text-base font-extrabold text-text-main">{c.factions}</h3>
                <StatusIndicator tone={preset.isValid ? 'emerald' : 'crimson'}>
                  <span className="tabular-nums">
                    {preset.mafiaCount} vs {playersCount - preset.mafiaCount}
                  </span>
                </StatusIndicator>
              </div>

              {/* Mafia Count */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-[12px] bg-[#963F46]/10 border border-[#963F46]/40">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={MAFIA_ROLE_CATALOG.mafia.portrait}
                    alt={c.mafiaTeam}
                    className="w-11 h-11 rounded-[8px] object-cover border border-[#963F46]/45 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-danger-text leading-tight">{c.mafiaTeam}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      1 – {maxAllowedMafia}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-bg-main/80 p-1 rounded-[10px] border border-border-strong shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setMafiaCount((v) => Math.max(1, v - 1));
                    }}
                    disabled={mafiaCount <= 1}
                    aria-label="Decrease Mafia"
                    className="min-w-[44px] min-h-[44px] rounded-[8px] bg-bg-card text-text-main font-bold disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-mono-code font-extrabold text-base tabular-nums">
                    {preset.mafiaCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setMafiaCount((v) => Math.min(maxAllowedMafia, v + 1));
                    }}
                    disabled={mafiaCount >= maxAllowedMafia}
                    aria-label="Increase Mafia"
                    className="min-w-[44px] min-h-[44px] rounded-[8px] bg-bg-card text-text-main font-bold disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* City Citizens Summary */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-[12px] bg-[#668F9A]/10 border border-[#668F9A]/35">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={MAFIA_ROLE_CATALOG.citizen.portrait}
                    alt={c.citizens}
                    className="w-11 h-11 rounded-[8px] object-cover border border-[#668F9A]/45 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-cyan-text truncate">{c.cityTeam}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {c.citizens}: {preset.citizenCount}
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-[8px] bg-[#668F9A] text-[#080B10] font-extrabold text-base tabular-nums">
                  {playersCount - preset.mafiaCount}
                </span>
              </div>

              {/* Optional Special Roles */}
              <div className="space-y-2.5 pt-1">
                <InteractiveCard
                  selected={enableDetective}
                  accent="cyan"
                  onClick={() => {
                    playSound('click');
                    setEnableDetective((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-3 text-start"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Search size={18} className="text-cyan-text shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-main">{c.detective}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {MAFIA_ROLE_CATALOG.detective.nightActionHint[isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en']}
                      </p>
                    </div>
                  </div>
                  <StatusIndicator tone={enableDetective ? 'cyan' : 'neutral'}>
                    {enableDetective ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>

                <InteractiveCard
                  selected={enableDoctor}
                  accent="gold"
                  onClick={() => {
                    playSound('click');
                    setEnableDoctor((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-3 text-start"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Stethoscope size={18} className="text-emerald-text shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-main">{c.doctor}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {MAFIA_ROLE_CATALOG.doctor.nightActionHint[isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en']}
                      </p>
                    </div>
                  </div>
                  <StatusIndicator tone={enableDoctor ? 'emerald' : 'neutral'}>
                    {enableDoctor ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>

                <InteractiveCard
                  selected={enableMafiaBoss}
                  accent="crimson"
                  onClick={() => {
                    playSound('click');
                    setEnableMafiaBoss((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-3 text-start"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Crown size={18} className="text-primary-text shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-main">{c.boss}</p>
                      <p className="text-[11px] text-text-muted truncate">{c.bossHint}</p>
                    </div>
                  </div>
                  <StatusIndicator tone={enableMafiaBoss ? 'crimson' : 'neutral'}>
                    {enableMafiaBoss ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>
              </div>
            </IntelligencePanel>
          </div>

          {/* Right Column: Rules & Timers */}
          <div className="space-y-4">
            <IntelligencePanel className="p-4 sm:p-5 space-y-4">
              {/* Timers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-main mb-2 flex items-center gap-1.5">
                    <BlacksiteIcon name="timer" size={14} />
                    <span>{c.discussionTimer}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[90, 120, 180].map((sec) => (
                      <InteractiveCard
                        key={sec}
                        selected={discussionDurationSeconds === sec}
                        accent="cyan"
                        onClick={() => {
                          playSound('click');
                          setDiscussionDurationSeconds(sec);
                        }}
                        className="py-2 text-xs font-mono-code font-bold tabular-nums"
                      >
                        {sec}s
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-main mb-2 flex items-center gap-1.5">
                    <BlacksiteIcon name="secretVote" size={14} />
                    <span>{c.votingTimer}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[45, 60, 90].map((sec) => (
                      <InteractiveCard
                        key={sec}
                        selected={votingDurationSeconds === sec}
                        accent="gold"
                        onClick={() => {
                          playSound('click');
                          setVotingDurationSeconds(sec);
                        }}
                        className="py-2 text-xs font-mono-code font-bold tabular-nums"
                      >
                        {sec}s
                      </InteractiveCard>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tie Resolution */}
              <div className="pt-3 border-t border-border">
                <label className="text-xs font-bold text-text-main mb-2 flex items-center gap-1.5">
                  <Scale size={14} className="text-primary-text" />
                  <span>{c.tieRuleLabel}</span>
                </label>
                <SegmentedControl
                  value={tieRule}
                  onChange={(v) => {
                    playSound('click');
                    setTieRule(v);
                  }}
                  options={[
                    { value: 'revote', label: c.revote },
                    { value: 'no_elimination', label: c.noElim },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Tactical Toggles */}
              <div className="space-y-2 pt-3 border-t border-border">
                {enableDoctor && (
                  <InteractiveCard
                    selected={doctorAllowConsecutive}
                    accent="gold"
                    onClick={() => {
                      playSound('click');
                      setDoctorAllowConsecutive((v) => !v);
                    }}
                    className="w-full p-3 flex items-center justify-between gap-2 text-start"
                  >
                    <span className="text-xs font-bold text-text-main flex items-center gap-2">
                      <Shield size={14} className="text-emerald-text shrink-0" />
                      <span>{c.doctorRule}</span>
                    </span>
                    <StatusIndicator tone={doctorAllowConsecutive ? 'gold' : 'neutral'}>
                      {doctorAllowConsecutive ? c.allowed : c.blocked}
                    </StatusIndicator>
                  </InteractiveCard>
                )}

                <InteractiveCard
                  selected={enableNominationDefense}
                  accent="cyan"
                  onClick={() => {
                    playSound('click');
                    setEnableNominationDefense((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-2 text-start"
                >
                  <span className="text-xs font-bold text-text-main">{c.nominationDefense}</span>
                  <StatusIndicator tone={enableNominationDefense ? 'cyan' : 'neutral'}>
                    {enableNominationDefense ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>

                <InteractiveCard
                  selected={revealRoleOnExit}
                  accent="gold"
                  onClick={() => {
                    playSound('click');
                    setRevealRoleOnExit((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-2 text-start"
                >
                  <span className="text-xs font-bold text-text-main">{c.revealOnExit}</span>
                  <StatusIndicator tone={revealRoleOnExit ? 'gold' : 'neutral'}>
                    {revealRoleOnExit ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>

                <InteractiveCard
                  selected={allowAbstention}
                  accent="cyan"
                  onClick={() => {
                    playSound('click');
                    setAllowAbstention((v) => !v);
                  }}
                  className="w-full p-3 flex items-center justify-between gap-2 text-start"
                >
                  <span className="text-xs font-bold text-text-main">{c.abstention}</span>
                  <StatusIndicator tone={allowAbstention ? 'cyan' : 'neutral'}>
                    {allowAbstention ? c.enabled : c.disabled}
                  </StatusIndicator>
                </InteractiveCard>
              </div>
            </IntelligencePanel>
          </div>
        </div>

        <BottomActionBar className="mt-auto">
          <div className="w-full max-w-md mx-auto">
            <TacticalButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={!preset.isValid}
              onClick={handleLaunch}
              icon={<BlacksiteIcon name="playOperation" size={18} tone="ink" rtlFlip />}
            >
              {c.startMafia}
            </TacticalButton>
          </div>
        </BottomActionBar>
      </div>
    </div>
  );
};
