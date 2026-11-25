import React, { useState } from 'react';
import {
  clearAllData,
  resetScores,
  getSettings,
  saveSettings,
  AppSettings,
} from '../services/storageService';
import { playSound, SOUND_EFFECT_LIST, SoundType } from '../services/soundService';
import { getUITranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  Globe,
  Volume2,
  Volume1,
  Trash2,
  AlertOctagon,
  Info,
  Palette,
  PaintBucket,
  Shield,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  ScreenSectionHeader,
  TacticalButton,
} from './ui/BlacksiteUI';

interface SettingsScreenProps {
  onBack: () => void;
  onThemeChange: (theme: 'dark' | 'gray' | 'light' | 'system') => void;
  onButtonColorChange: (
    color: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange'
  ) => void;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { id: 'ar', labelKey: 'arabic', symbol: 'AR' },
  { id: 'en', labelKey: 'english', symbol: 'EN' },
  { id: 'fr', labelKey: 'french', symbol: 'FR' },
  { id: 'es', labelKey: 'spanish', symbol: 'ES' },
  { id: 'de', labelKey: 'german', symbol: 'DE' },
  { id: 'tr', labelKey: 'turkish', symbol: 'TR' },
  { id: 'pt', labelKey: 'portuguese', symbol: 'PT' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onThemeChange,
  onButtonColorChange,
  onLanguageChange,
}) => {
  const { user, isAdmin, refreshAdminStatus } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminCheckMessage, setAdminCheckMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<null | 'scores' | 'all'>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activePreviewSound, setActivePreviewSound] = useState<SoundType | null>(null);
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    const newSettings = { ...settings, soundVolume: newVolume };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleTestSound = () => {
    playSound('pop');
  };

  const handleHapticChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = { ...settings, hapticEnabled: e.target.checked };
    setSettings(newSettings);
    saveSettings(newSettings);
    if (newSettings.hapticEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    saveSettings(newSettings);
    playSound('click');
    onLanguageChange(newLang);
  };

  const handleThemeChange = (theme: 'dark' | 'gray' | 'light' | 'system') => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    saveSettings(newSettings);
    playSound('click');
    onThemeChange(theme);
  };

  const handleButtonColorChange = (
    color: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange'
  ) => {
    const newSettings = { ...settings, buttonColor: color };
    setSettings(newSettings);
    saveSettings(newSettings);
    playSound('click');
    onButtonColorChange(color);
  };

  const handleConfirmAction = () => {
    if (pendingConfirm === 'scores') {
      resetScores();
      playSound('click');
      setPendingConfirm(null);
      showToast(t('scoresReset'));
    } else if (pendingConfirm === 'all') {
      clearAllData();
      playSound('dramatic');
      setPendingConfirm(null);
      showToast(t('appReset'));
      setTimeout(() => window.location.reload(), 600);
    }
  };

  const handleRefreshAdmin = async () => {
    if (checkingAdmin) return;
    setCheckingAdmin(true);
    setAdminCheckMessage(null);
    try {
      const granted = await refreshAdminStatus();
      playSound(granted ? 'click' : 'error');
      setAdminCheckMessage(
        granted
          ? t('adminSuccess')
          : isRTL
          ? 'هذا الحساب لا يملك صلاحية إدارة من الخادم.'
          : 'This account does not have server-granted admin permissions.'
      );
    } finally {
      setCheckingAdmin(false);
    }
  };

  const grayLabel = isRTL ? 'رمادي داكن' : lang === 'fr' ? 'Gris Tactique' : 'Slate Gray';

  return (
    <div className="flex flex-col h-full overflow-hidden max-w-3xl mx-auto w-full relative">
      <BlacksiteScreenBackdrop bgKey="profile" texture="carbon" />
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#3E7B67] text-[#F4F6F8] px-5 py-2.5 rounded-[10px] border border-white/15 shadow-2xl font-bold text-sm">
          {toastMsg}
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1 overflow-hidden w-full">
      <div className="flex-1 overflow-y-auto pt-4 px-4 sm:px-6 pb-8 custom-scrollbar">
        <DossierHeaderBand
          accent="gold"
          texture="carbon"
          className="mb-5"
          badge={<ClassifiedStamp tone="gold">SYS-CONFIG</ClassifiedStamp>}
          title={t('settings')}
          icon={<Settings size={20} />}
        />

        <div className="space-y-4">
          {/* Language Section */}
          <IntelligencePanel className="relative overflow-hidden blacksite-texture-carbon p-4 sm:p-5">
            <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
            <ScreenSectionHeader
              title={t('language')}
              icon={<Globe size={17} />}
              className="mb-4"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((langItem) => {
                const active = settings.language === langItem.id;
                return (
                  <InteractiveCard
                    key={langItem.id}
                    selected={active}
                    accent="gold"
                    onClick={() => handleLanguageChange(langItem.id)}
                    className={`min-h-[48px] py-2.5 px-3 font-bold flex items-center justify-between gap-2 ${
                      active ? 'text-text-main' : 'text-text-muted'
                    }`}
                  >
                    <span className="text-xs sm:text-sm truncate">
                      {t(langItem.labelKey) || langItem.labelKey}
                    </span>
                    <span
                      dir="ltr"
                      className={`font-mono-code text-[11px] font-semibold px-1.5 py-0.5 rounded-[6px] ${
                        active ? 'bg-[#B49A62] text-[#080B10]' : 'bg-bg-dark/40 text-text-muted'
                      }`}
                    >
                      {langItem.symbol}
                    </span>
                  </InteractiveCard>
                );
              })}
            </div>
          </IntelligencePanel>

          {/* Theme Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <ScreenSectionHeader
              title={t('theme')}
              icon={<Palette size={17} />}
              className="mb-4"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'dark' as const, label: t('themeDark'), swatch: 'bg-[#080B10] border-[#B49A62]/40' },
                { id: 'gray' as const, label: grayLabel, swatch: 'bg-[#202731] border-white/25' },
                { id: 'light' as const, label: t('themeLight'), swatch: 'bg-[#F3F5F8] border-slate-400' },
                {
                  id: 'system' as const,
                  label: t('themeSystem'),
                  swatch: 'bg-gradient-to-br from-[#080B10] via-[#202B36] to-[#F3F5F8] border-border-strong',
                },
              ].map((item) => {
                const active = settings.theme === item.id;
                return (
                  <InteractiveCard
                    key={item.id}
                    selected={active}
                    accent="gold"
                    onClick={() => handleThemeChange(item.id)}
                    className={`p-3 flex flex-col items-center justify-center gap-2 min-h-[76px] ${
                      active ? 'text-text-main' : 'text-text-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-[8px] border shadow-inner ${item.swatch}`} />
                    <span className="text-xs font-bold text-center">{item.label}</span>
                  </InteractiveCard>
                );
              })}
            </div>
          </IntelligencePanel>

          {/* Accent Color Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <ScreenSectionHeader
              title={t('buttonColors')}
              icon={<PaintBucket size={17} />}
              className="mb-4"
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'default', color: 'bg-[#B49A62]', name: t('colorDefault') },
                { id: 'blue', color: 'bg-[#4B728F]', name: t('colorBlue') },
                { id: 'green', color: 'bg-[#4E806F]', name: t('colorGreen') },
                { id: 'red', color: 'bg-[#9E4A50]', name: t('colorRed') },
                { id: 'purple', color: 'bg-[#636F85]', name: t('colorPurple') },
                { id: 'orange', color: 'bg-[#A6764B]', name: t('colorOrange') },
              ].map((btnColor) => {
                const isSelected =
                  settings.buttonColor === btnColor.id ||
                  (!settings.buttonColor && btnColor.id === 'default');
                return (
                  <InteractiveCard
                    key={btnColor.id}
                    selected={isSelected}
                    accent="gold"
                    onClick={() => handleButtonColorChange(btnColor.id as any)}
                    className={`py-2.5 px-2 font-bold flex flex-col items-center justify-center gap-1.5 min-h-[60px] ${
                      isSelected ? 'text-text-main' : 'text-text-muted'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-[6px] ${btnColor.color} border border-white/20`}
                    />
                    <span className="text-xs truncate max-w-full">{btnColor.name}</span>
                  </InteractiveCard>
                );
              })}
            </div>
          </IntelligencePanel>

          {/* Preferences Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <ScreenSectionHeader
              title={t('soundVibration')}
              icon={<Volume2 size={17} />}
              className="mb-4"
            />

            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-text-muted">{t('volume')}</span>
                <span className="text-sm text-primary-text font-bold font-mono-code tabular-nums">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Volume1 size={16} className="text-text-muted shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                  onMouseUp={handleTestSound}
                  onTouchEnd={handleTestSound}
                  className="w-full h-2 bg-bg-card rounded-[6px] appearance-none cursor-pointer accent-[#B49A62] border border-border"
                />
                <Volume2 size={16} className="text-text-muted shrink-0" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-bold text-text-muted">{t('vibration')}</span>
              <label className="relative inline-flex items-center justify-end cursor-pointer min-w-[44px] min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.hapticEnabled}
                  onChange={handleHapticChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-card rounded-full relative peer peer-checked:after:translate-x-full peer-checked:after:border-[#080B10] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ECEFF4] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B49A62] border border-border-strong" />
              </label>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-text-main">
                  {isRTL
                    ? 'تجربة المؤثرات الصوتية'
                    : lang === 'fr'
                    ? 'Tester les effets sonores'
                    : 'Sound Effects Preview'}
                </span>
                <span className="text-[11px] font-mono-code font-semibold text-text-muted tabular-nums" dir="ltr">
                  {SOUND_EFFECT_LIST.length} SFX
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SOUND_EFFECT_LIST.map((sfx) => {
                  const isPlaying = activePreviewSound === sfx.id;
                  const label =
                    isRTL ? sfx.labels.ar : lang === 'fr' ? sfx.labels.fr : sfx.labels.en;
                  return (
                    <InteractiveCard
                      key={sfx.id}
                      selected={isPlaying}
                      accent="cyan"
                      onClick={() => {
                        setActivePreviewSound(sfx.id);
                        playSound(sfx.id);
                        setTimeout(() => {
                          setActivePreviewSound((curr) => (curr === sfx.id ? null : curr));
                        }, 360);
                      }}
                      className={`px-3.5 py-2 rounded-[9px] text-xs font-bold ${
                        isPlaying ? 'text-cyan-text' : 'text-text-muted'
                      }`}
                    >
                      {label}
                    </InteractiveCard>
                  );
                })}
              </div>
            </div>
          </IntelligencePanel>

          {/* Server-Verified Admin Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <ScreenSectionHeader
              title={t('adminMode')}
              icon={<Shield size={17} className={isAdmin ? 'text-primary-text' : 'text-text-muted'} />}
              className="mb-3"
            />

            {isAdmin ? (
              <div className="flex items-center gap-3 bg-[#B49A62]/12 p-3.5 rounded-[10px] border border-[#B49A62]/35">
                <CheckCircle className="text-primary-text w-5 h-5 shrink-0" />
                <span className="font-bold text-primary-text text-sm">{t('adminSuccess')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-text-muted leading-relaxed">
                  {user
                    ? isRTL
                      ? 'يتم التحقق من صلاحيات الإدارة حصرياً عبر Firebase Custom Claims وسجل المشرفين على الخادم.'
                      : 'Admin privileges are verified strictly via server-side Firebase Custom Claims.'
                    : isRTL
                    ? 'سجّل الدخول أولاً للتحقق من صلاحيات الإدارة المرتبطة بحسابك.'
                    : 'Sign in first to verify server-granted admin permissions for your account.'}
                </p>
                {user && (
                  <TacticalButton
                    variant="secondary"
                    fullWidth
                    loading={checkingAdmin}
                    onClick={handleRefreshAdmin}
                    icon={<RefreshCw size={16} />}
                  >
                    {isRTL ? 'التحقق من صلاحيات الإدارة' : 'Verify Admin Permissions'}
                  </TacticalButton>
                )}
                {adminCheckMessage && (
                  <p className="text-center text-xs font-bold text-text-muted">
                    {adminCheckMessage}
                  </p>
                )}
              </div>
            )}
          </IntelligencePanel>

          {/* Data Management Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <h3 className="font-bold text-base text-text-main mb-1.5">{t('dataManagement')}</h3>
            <p className="text-text-muted text-xs mb-4 leading-relaxed">
              {t('dataManagementDesc')}
            </p>

            <div className="space-y-2.5">
              <TacticalButton
                variant="danger"
                fullWidth
                onClick={() => setPendingConfirm('scores')}
                icon={<Trash2 size={16} />}
              >
                {t('resetScores')}
              </TacticalButton>

              <TacticalButton
                variant="secondary"
                fullWidth
                onClick={() => setPendingConfirm('all')}
                icon={<AlertOctagon size={16} className="text-danger-text" />}
                className="border-[#963F46]/40 text-danger-text hover:bg-[#963F46]/10"
              >
                {t('resetApp')}
              </TacticalButton>
            </div>
          </IntelligencePanel>

          {/* Info Section */}
          <IntelligencePanel className="p-4 sm:p-5">
            <ScreenSectionHeader title={t('info')} icon={<Info size={17} />} className="mb-3" />
            <div className="flex items-center justify-between bg-bg-card p-3 rounded-[10px] border border-border text-sm font-bold text-text-muted">
              <span>{t('language')}</span>
              <span dir="ltr" className="font-mono-code text-text-main uppercase">
                {settings.language}
              </span>
            </div>
          </IntelligencePanel>
        </div>
      </div>

      {/* Bottom Save & Back CTA */}
      <BottomActionBar className="mx-0 sm:mx-0 shrink-0">
        <div className="max-w-md mx-auto">
          <TacticalButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              playSound('click');
              onBack();
            }}
          >
            {t('saveBack')}
          </TacticalButton>
        </div>
      </BottomActionBar>
      </div>

      {/* In-App Confirmation Modal */}
      {pendingConfirm && (
        <div
          onClick={() => setPendingConfirm(null)}
          className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-5"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <ModalShell
              maxWidthClass="max-w-sm"
              className="p-6 text-center"
              onClose={() => setPendingConfirm(null)}
              ariaLabel={t('alert')}
            >
            <h3 className="text-lg font-extrabold text-text-main mb-2">{t('alert')}</h3>
            <p className="text-sm font-medium text-text-muted mb-6 leading-relaxed">
              {pendingConfirm === 'scores' ? t('confirmResetScores') : t('confirmResetApp')}
            </p>
            <div className="flex gap-3">
              <TacticalButton
                variant="secondary"
                onClick={() => setPendingConfirm(null)}
                className="flex-1"
              >
                {t('cancel')}
              </TacticalButton>
              <TacticalButton
                variant="danger"
                onClick={handleConfirmAction}
                className="flex-1"
              >
                {t('confirm')}
              </TacticalButton>
            </div>
              </ModalShell>
          </div>
        </div>
      )}
    </div>
  );
};
