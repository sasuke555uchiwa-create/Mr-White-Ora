import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Moon, Search, Shield, Skull } from 'lucide-react';
import { MafiaMatchState } from '../../src/game/mafia/mafiaTypes';
import {
  canDoctorProtectTarget,
  getActiveNightSteps,
  getInvestigationResult,
  getMafiaTeammatesForPlayer,
  NightActionStepKind,
} from '../../src/game/mafia/mafiaEngine';
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
  InteractiveCard,
  StatusIndicator,
  TacticalButton,
} from '../ui/BlacksiteUI';

interface MafiaNightScreenProps {
  match: MafiaMatchState;
  onCompleteNight: (actions: {
    mafiaActorId?: string | null;
    mafiaTargetId?: string | null;
    doctorActorId?: string | null;
    doctorTargetId?: string | null;
    detectiveActorId?: string | null;
    detectiveTargetId?: string | null;
  }) => void;
}

export const MafiaNightScreen: React.FC<MafiaNightScreenProps> = ({ match, onCompleteNight }) => {
  const lang = getSettings().language || 'ar';
  const isRTL = ['ar', 'sa'].includes(lang);
  const langKey = isRTL ? 'ar' : lang === 'fr' ? 'fr' : 'en';

  const steps = useMemo(() => getActiveNightSteps(match), [match]);
  const [stepIdx, setStepIdx] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  const [mafiaTargetId, setMafiaTargetId] = useState<string | null>(null);
  const [doctorTargetId, setDoctorTargetId] = useState<string | null>(null);
  const [detectiveTargetId, setDetectiveTargetId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<'city' | 'mafia' | null>(null);

  const activeStep: NightActionStepKind | undefined = steps[stepIdx];
  const livingPlayers = match.players.filter((p) => p.isAlive);
  const livingMafia = livingPlayers.filter((p) => p.faction === 'mafia');
  const livingCity = livingPlayers.filter((p) => p.faction === 'city');
  const livingDoctor = livingPlayers.find((p) => p.role === 'doctor') || null;
  const livingDetective = livingPlayers.find((p) => p.role === 'detective') || null;

  const isOpeningNight = match.phase === 'opening_night';

  const copy = {
    ar: {
      nightBadge: isOpeningNight ? 'الليلة الافتتاحية (تعارف)' : `الليلة ${match.nightNumber}`,
      moderatorPrompt: 'أغلق الجميع أعينهم. يعمل المشرف الرقمي خطوة بخطوة:',
      steps: {
        mafia_coordination: {
          caller: 'فريق المافيا: افتحوا أعينكم بصمت لتتعرّفوا على بعضكم (بدون إخراج الليلة)',
          cta: 'فتح قائمة أعضاء المافيا',
          title: 'تنسيق المافيا الافتتاحي',
          desc: 'هذه ليلة تعارف فقط. لا يُخرج أي لاعب في الليلة الأولى. تبدأ القدرات الليلية في الليالي القادمة.',
          done: 'إخفاء الشاشة والمتابعة إلى الفجر',
        },
        mafia: {
          caller: 'يمرَّر الجهاز إلى فريق المافيا لاختيار هدف الليلة',
          cta: 'تأكيد — افتح ملف المافيا',
          title: 'اختيار هدف المافيا',
          desc: 'اختر أحد لاعبي المدينة لإخراجه هذه الليلة:',
          done: 'تأكيد الهدف وإغلاق الشاشة',
        },
        doctor: {
          caller: 'يمرَّر الجهاز إلى الطبيب الميداني',
          cta: 'تأكيد — افتح ملف الطبيب',
          title: 'درع الحماية الليلي',
          desc: 'اختر لاعباً لحمايته هذه الليلة من هجوم المافيا:',
          consecutiveBlocked: 'لا يمكن حماية نفس اللاعب ليلتين متتاليتين.',
          done: 'تأكيد الحماية وإغلاق الشاشة',
        },
        detective: {
          caller: 'يمرَّر الجهاز إلى المحقق السري',
          cta: 'تأكيد — افتح ملف المحقق',
          title: 'فحص سري للهوية',
          desc: 'اختر لاعباً لفحص انتمائه (المدينة أم المافيا):',
          scanCta: 'فحص الملف الآن',
          resultCity: 'نتيجة الفحص: تابع لفريق المدينة',
          resultMafia: 'نتيجة الفحص: عضو في المافيا!',
          done: 'مسح النتيجة وإغلاق الشاشة',
        },
      },
    },
    fr: {
      nightBadge: isOpeningNight ? 'Nuit 0 (Coordination)' : `Nuit ${match.nightNumber}`,
      moderatorPrompt: 'Tout le monde ferme les yeux. Passage secret étape par étape :',
      steps: {
        mafia_coordination: {
          caller: 'Mafia : reconnaissez vos alliés en silence (aucune élimination cette nuit)',
          cta: 'Afficher les alliés Mafia',
          title: 'Nuit d’ouverture — Coordination',
          desc: 'Nuit d’introduction uniquement : aucune élimination. Les capacités commencent la nuit suivante.',
          done: 'Masquer et passer à l’aube',
        },
        mafia: {
          caller: 'Passez l’appareil au camp Mafia pour choisir une cible',
          cta: 'Déverrouiller Dossier Mafia',
          title: 'Cible de la Mafia',
          desc: 'Choisissez un joueur de la Cité à viser cette nuit :',
          done: 'Valider la cible et masquer',
        },
        doctor: {
          caller: 'Passez l’appareil au Médecin',
          cta: 'Déverrouiller Dossier Médecin',
          title: 'Protection Médicale',
          desc: 'Choisissez qui protéger cette nuit :',
          consecutiveBlocked: 'Impossible de protéger la même personne deux nuits de suite.',
          done: 'Valider la protection et masquer',
        },
        detective: {
          caller: 'Passez l’appareil au Détective',
          cta: 'Déverrouiller Dossier Détective',
          title: 'Enquête Secrète',
          desc: 'Choisissez un joueur vivant à vérifier :',
          scanCta: 'Lancer la vérification',
          resultCity: 'Résultat : Affilié à la Cité',
          resultMafia: 'Résultat : Membre de la Mafia !',
          done: 'Effacer le résultat et masquer',
        },
      },
    },
    en: {
      nightBadge: isOpeningNight ? 'Opening Night (Sync)' : `Night ${match.nightNumber}`,
      moderatorPrompt: 'Everyone close your eyes. Digital moderator passes confidentially:',
      steps: {
        mafia_coordination: {
          caller: 'Mafia team: confirm your syndicate allies silently (no removal tonight)',
          cta: 'Reveal Mafia Allies',
          title: 'Opening Coordination Night',
          desc: 'Introductory round only — no player is removed tonight. Night abilities activate on subsequent nights.',
          done: 'Hide Screen & Proceed to Dawn',
        },
        mafia: {
          caller: 'Pass device to the Mafia Syndicate to lock tonight’s target',
          cta: 'Unlock Mafia Console',
          title: 'Syndicate Target Selection',
          desc: 'Select one living City operative for tonight:',
          done: 'Lock Target & Hide Screen',
        },
        doctor: {
          caller: 'Pass device to the Doctor',
          cta: 'Unlock Doctor Console',
          title: 'Night Protection Shield',
          desc: 'Select one living player to shield tonight:',
          consecutiveBlocked: 'Cannot guard the same target two consecutive nights.',
          done: 'Confirm Shield & Hide Screen',
        },
        detective: {
          caller: 'Pass device to the Detective',
          cta: 'Unlock Detective Console',
          title: 'Confidential Identity Scan',
          desc: 'Choose another living player to investigate:',
          scanCta: 'Run Identity Scan',
          resultCity: 'Scan Result: CITY FACTION',
          resultMafia: 'Scan Result: MAFIA SYNDICATE',
          done: 'Wipe Result & Hide Screen',
        },
      },
    },
  }[langKey];

  const handleStepComplete = () => {
    playSound('handoff');
    setUnlocked(false);
    setScanResult(null);

    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
      return;
    }

    onCompleteNight({
      mafiaActorId: livingMafia[0]?.id ?? null,
      mafiaTargetId,
      doctorActorId: livingDoctor?.id ?? null,
      doctorTargetId,
      detectiveActorId: livingDetective?.id ?? null,
      detectiveTargetId,
    });
  };

  if (!activeStep) return null;
  const stepCopy = copy.steps[activeStep];

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 pb-0 max-w-2xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="voting" texture="carbon" />
      <div className="relative z-10 flex flex-col flex-1">
        <DossierHeaderBand
          accent="crimson"
          texture="carbon"
          className="mb-4"
          badge={<ClassifiedStamp tone="crimson">{copy.nightBadge}</ClassifiedStamp>}
          title={copy.nightBadge}
          subtitle={copy.moderatorPrompt}
          icon={<Moon size={20} className="text-danger-text" />}
          action={
            <StatusIndicator tone="neutral">
              <span className="tabular-nums">
                {stepIdx + 1} / {steps.length}
              </span>
            </StatusIndicator>
          }
        />

        {!unlocked ? (
          <IntelligencePanel className="my-auto p-6 sm:p-8 text-center space-y-5 border-[#963F46]/45">
            <div className="w-16 h-16 rounded-[14px] bg-[#080B10] border border-[#963F46]/50 flex items-center justify-center mx-auto">
              <Lock size={28} className="text-danger-text" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-text-main leading-relaxed">
              {stepCopy.caller}
            </p>
            <TacticalButton
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => {
                playSound('dossierOpen');
                setUnlocked(true);
              }}
              icon={<Eye size={18} />}
            >
              {stepCopy.cta}
            </TacticalButton>
          </IntelligencePanel>
        ) : (
          <div className="flex flex-col flex-1 space-y-4">
            <ClassifiedDossierPanel className="p-4 sm:p-5 space-y-4 border-[#963F46]/50">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="text-start">
                  <h3 className="text-base sm:text-lg font-extrabold text-text-main">
                    {stepCopy.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">{stepCopy.desc}</p>
                </div>
                {activeStep === 'doctor' ? (
                  <Shield size={20} className="text-emerald-text shrink-0" />
                ) : activeStep === 'detective' ? (
                  <Search size={20} className="text-cyan-text shrink-0" />
                ) : (
                  <Skull size={20} className="text-danger-text shrink-0" />
                )}
              </div>

              {activeStep === 'mafia_coordination' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {livingMafia.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-[10px] bg-[#963F46]/12 border border-[#963F46]/45 flex items-center gap-3"
                    >
                      <Avatar avatar={m.avatar} name={m.name} size={40} />
                      <div className="min-w-0 text-start">
                        <p className="text-sm font-bold text-text-main truncate">{m.name}</p>
                        <ClassifiedStamp tone={m.role === 'mafia_boss' ? 'gold' : 'crimson'}>
                          {m.role === 'mafia_boss' ? 'BOSS' : 'MAFIA'}
                        </ClassifiedStamp>
                      </div>
                    </div>
                  ))}
                  {getMafiaTeammatesForPlayer(match.players, livingMafia[0]?.id || '').length === 0 && (
                    <p className="text-xs text-text-muted col-span-full text-center py-2">
                      {livingMafia[0]?.name}
                    </p>
                  )}
                </div>
              )}

              {activeStep === 'mafia' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {livingCity.map((target) => {
                    const selected = mafiaTargetId === target.id;
                    return (
                      <InteractiveCard
                        key={target.id}
                        selected={selected}
                        accent="crimson"
                        onClick={() => {
                          playSound('click');
                          setMafiaTargetId(target.id);
                        }}
                        className="p-3 flex flex-col items-center gap-2"
                      >
                        <Avatar avatar={target.avatar} name={target.name} size={44} />
                        <span className="text-xs font-bold text-text-main truncate max-w-full">
                          {target.name}
                        </span>
                      </InteractiveCard>
                    );
                  })}
                </div>
              )}

              {activeStep === 'doctor' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {livingPlayers.map((target) => {
                      const check = canDoctorProtectTarget(match, target.id);
                      const selected = doctorTargetId === target.id;
                      return (
                        <InteractiveCard
                          key={target.id}
                          selected={selected}
                          disabled={!check.allowed}
                          accent="gold"
                          onClick={() => {
                            if (!check.allowed) return;
                            playSound('click');
                            setDoctorTargetId(target.id);
                          }}
                          className={`p-3 flex flex-col items-center gap-2 ${
                            !check.allowed ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          <Avatar avatar={target.avatar} name={target.name} size={44} />
                          <span className="text-xs font-bold text-text-main truncate max-w-full">
                            {target.name}
                          </span>
                        </InteractiveCard>
                      );
                    })}
                  </div>
                  {!match.settings.doctorAllowConsecutiveProtection && match.lastDoctorTargetId && (
                    <p className="text-[11px] text-text-muted text-center">
                      {copy.steps.doctor.consecutiveBlocked}
                    </p>
                  )}
                </div>
              )}

              {activeStep === 'detective' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {livingPlayers
                      .filter((p) => p.id !== livingDetective?.id)
                      .map((target) => {
                        const selected = detectiveTargetId === target.id;
                        return (
                          <InteractiveCard
                            key={target.id}
                            selected={selected}
                            disabled={scanResult !== null}
                            accent="cyan"
                            onClick={() => {
                              if (scanResult !== null) return;
                              playSound('click');
                              setDetectiveTargetId(target.id);
                            }}
                            className="p-3 flex flex-col items-center gap-2"
                          >
                            <Avatar avatar={target.avatar} name={target.name} size={44} />
                            <span className="text-xs font-bold text-text-main truncate max-w-full">
                              {target.name}
                            </span>
                          </InteractiveCard>
                        );
                      })}
                  </div>

                  {detectiveTargetId && scanResult === null && (
                    <TacticalButton
                      variant="cyan"
                      size="md"
                      fullWidth
                      onClick={() => {
                        const target = match.players.find((p) => p.id === detectiveTargetId);
                        if (!target) return;
                        playSound('accessGranted');
                        setScanResult(getInvestigationResult(target.role));
                      }}
                      icon={<Search size={16} />}
                    >
                      {copy.steps.detective.scanCta}
                    </TacticalButton>
                  )}

                  {scanResult !== null && (
                    <div
                      className={`p-4 rounded-[12px] border text-center font-extrabold text-sm ${
                        scanResult === 'mafia'
                          ? 'bg-[#963F46]/18 border-[#963F46] text-danger-text'
                          : 'bg-[#668F9A]/18 border-[#668F9A] text-cyan-text'
                      }`}
                    >
                      {scanResult === 'mafia'
                        ? copy.steps.detective.resultMafia
                        : copy.steps.detective.resultCity}
                    </div>
                  )}
                </div>
              )}
            </ClassifiedDossierPanel>

            <BottomActionBar className="mt-auto">
              <div className="w-full max-w-md mx-auto">
                <TacticalButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={
                    (activeStep === 'mafia' && !mafiaTargetId) ||
                    (activeStep === 'doctor' && !doctorTargetId) ||
                    (activeStep === 'detective' && scanResult === null)
                  }
                  onClick={handleStepComplete}
                  icon={<EyeOff size={18} />}
                >
                  {stepCopy.done}
                </TacticalButton>
              </div>
            </BottomActionBar>
          </div>
        )}
      </div>
    </div>
  );
};
