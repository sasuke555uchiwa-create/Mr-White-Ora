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

interface SettingsScreenProps {
  onBack: () => void;
  onThemeChange: (theme: 'dark' | 'gray' | 'light' | 'system') => void;
  onButtonColorChange: (
    color: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange'
  ) => void;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { id: 'ar', labelKey: 'arabic', symbol: 'AR', color: 'bg-green-600' },
  { id: 'en', labelKey: 'english', symbol: 'EN', color: 'bg-blue-600' },
  { id: 'fr', labelKey: 'french', symbol: 'FR', color: 'bg-purple-600' },
  { id: 'es', labelKey: 'spanish', symbol: 'ES', color: 'bg-amber-600' },
  { id: 'de', labelKey: 'german', symbol: 'DE', color: 'bg-red-600' },
  { id: 'tr', labelKey: 'turkish', symbol: 'TR', color: 'bg-rose-600' },
  { id: 'pt', labelKey: 'portuguese', symbol: 'PT', color: 'bg-emerald-600' },
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
          : lang === 'ar'
          ? 'هذا الحساب لا يملك صلاحية إدارة من الخادم.'
          : 'This account does not have server-granted admin permissions.'
      );
    } finally {
      setCheckingAdmin(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden max-w-2xl mx-auto w-full relative">
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl font-black text-sm">
          {toastMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4 px-4 pb-8 scrollbar-hide">
        <div className="text-center mb-6 flex items-center justify-center gap-2">
          <Settings size={26} className="text-text-main" />
          <h2 className="text-2xl font-black text-text-main">{t('settings')}</h2>
        </div>

        <div className="space-y-4">
          {/* Language Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-4 flex items-center gap-2">
              <Globe size={20} className="text-sky-400" />
              <span>{t('language')}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {LANGUAGES.map((langItem) => (
                <button
                  key={langItem.id}
                  onClick={() => handleLanguageChange(langItem.id)}
                  className={`py-3.5 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                    settings.language === langItem.id
                      ? `${langItem.color} text-white shadow-lg border-white/25`
                      : 'bg-bg-dark/40 text-text-muted hover:bg-white/5 border-border'
                  }`}
                >
                  <span className="text-lg font-black">{langItem.symbol}</span>
                  <span className="text-xs">{t(langItem.labelKey) || langItem.labelKey}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-4 flex items-center gap-2">
              <Palette size={20} className="text-pink-400" />
              <span>{t('theme')}</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 py-1">
              {[
                { id: 'dark' as const, label: t('themeDark'), swatch: 'bg-slate-950 border-white/20' },
                { id: 'light' as const, label: t('themeLight'), swatch: 'bg-white border-slate-300' },
                {
                  id: 'system' as const,
                  label: t('themeSystem'),
                  swatch: 'bg-gradient-to-br from-slate-950 to-white border-white/25',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleThemeChange(item.id)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                    settings.theme === item.id
                      ? 'border-pink-400 bg-pink-500/15'
                      : 'border-border bg-bg-dark/40 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full border-2 shadow-inner ${item.swatch}`} />
                  <span className="text-xs font-black text-text-main">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Button Color Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-4 flex items-center gap-2">
              <PaintBucket size={20} className="text-amber-400" />
              <span>{t('buttonColors')}</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'default', color: 'bg-pink-500', name: t('colorDefault') },
                { id: 'blue', color: 'bg-blue-500', name: t('colorBlue') },
                { id: 'green', color: 'bg-emerald-500', name: t('colorGreen') },
                { id: 'red', color: 'bg-rose-500', name: t('colorRed') },
                { id: 'purple', color: 'bg-purple-500', name: t('colorPurple') },
                { id: 'orange', color: 'bg-orange-500', name: t('colorOrange') },
              ].map((btnColor) => {
                const isSelected =
                  settings.buttonColor === btnColor.id ||
                  (!settings.buttonColor && btnColor.id === 'default');
                return (
                  <button
                    key={btnColor.id}
                    onClick={() => handleButtonColorChange(btnColor.id as any)}
                    className={`py-3 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1.5 border ${
                      isSelected
                        ? 'bg-primary text-white shadow-lg border-white/25'
                        : 'bg-bg-dark/50 text-text-muted hover:bg-white/5 border-border'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full ${btnColor.color} shadow-inner border border-white/25`}
                    />
                    <span className="text-xs">{btnColor.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferences Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-4 flex items-center gap-2">
              <Volume2 size={20} className="text-emerald-400" />
              <span>{t('soundVibration')}</span>
            </h3>

            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-text-muted">{t('volume')}</span>
                <span className="text-sm text-primary font-black tabular-nums">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Volume1 size={16} className="text-text-muted" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                  onMouseUp={handleTestSound}
                  onTouchEnd={handleTestSound}
                  className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary border border-border"
                />
                <Volume2 size={16} className="text-text-muted" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-bold text-text-muted">{t('vibration')}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hapticEnabled}
                  onChange={handleHapticChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-dark rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border" />
              </label>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black text-text-main">
                  {lang === 'ar'
                    ? 'تجربة المؤثرات الصوتية'
                    : lang === 'fr'
                    ? 'Tester les effets sonores'
                    : 'Sound Effects Preview'}
                </span>
                <span className="text-[11px] font-bold text-text-muted tabular-nums">
                  {SOUND_EFFECT_LIST.length} SFX
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SOUND_EFFECT_LIST.map((sfx) => {
                  const isPlaying = activePreviewSound === sfx.id;
                  const label =
                    lang === 'ar' ? sfx.labels.ar : lang === 'fr' ? sfx.labels.fr : sfx.labels.en;
                  return (
                    <button
                      key={sfx.id}
                      type="button"
                      onClick={() => {
                        setActivePreviewSound(sfx.id);
                        playSound(sfx.id);
                        setTimeout(() => {
                          setActivePreviewSound((curr) => (curr === sfx.id ? null : curr));
                        }, 360);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                        isPlaying
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                          : 'bg-bg-dark/60 text-text-muted hover:text-text-main border-border hover:border-emerald-400/50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Server-Verified Admin Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-3 flex items-center gap-2">
              <Shield
                size={20}
                className={isAdmin ? 'text-primary' : 'text-text-muted'}
              />
              <span>{t('adminMode')}</span>
            </h3>

            {isAdmin ? (
              <div className="flex items-center gap-3 bg-primary/10 p-4 rounded-xl border border-primary/30">
                <CheckCircle className="text-primary w-6 h-6 shrink-0" />
                <span className="font-bold text-primary text-sm">{t('adminSuccess')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-text-muted leading-relaxed">
                  {user
                    ? lang === 'ar'
                      ? 'يتم التحقق من صلاحيات الإدارة حصرياً عبر Firebase Custom Claims وسجل المشرفين على الخادم.'
                      : 'Admin privileges are verified strictly via server-side Firebase Custom Claims.'
                    : lang === 'ar'
                    ? 'سجّل الدخول أولاً للتحقق من صلاحيات الإدارة المرتبطة بحسابك.'
                    : 'Sign in first to verify server-granted admin permissions for your account.'}
                </p>
                {user && (
                  <button
                    type="button"
                    onClick={handleRefreshAdmin}
                    disabled={checkingAdmin}
                    className="btn-modern w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw size={17} className={checkingAdmin ? 'animate-spin' : ''} />
                    <span>
                      {lang === 'ar' ? 'التحقق من صلاحيات الإدارة' : 'Verify Admin Permissions'}
                    </span>
                  </button>
                )}
                {adminCheckMessage && (
                  <p className="text-center text-xs font-bold text-text-muted">
                    {adminCheckMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Data Management Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-2">{t('dataManagement')}</h3>
            <p className="text-text-muted text-sm mb-4 font-bold">
              {t('dataManagementDesc')}
            </p>

            <button
              onClick={() => setPendingConfirm('scores')}
              className="btn-modern btn-modern-danger w-full py-3.5 rounded-xl font-black mb-3 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              <span>{t('resetScores')}</span>
            </button>

            <button
              onClick={() => setPendingConfirm('all')}
              className="w-full py-3.5 rounded-xl font-black text-white bg-rose-900 hover:bg-rose-800 border border-rose-500/30 flex items-center justify-center gap-2 transition-colors"
            >
              <AlertOctagon size={18} />
              <span>{t('resetApp')}</span>
            </button>
          </div>

          {/* Info Section */}
          <div className="card-modern p-5">
            <h3 className="font-black text-text-main mb-2 flex items-center gap-2">
              <Info size={20} className="text-sky-400" />
              <span>{t('info')}</span>
            </h3>
            <div className="flex items-center justify-between bg-bg-dark/40 p-3 rounded-xl border border-border text-sm font-bold text-text-muted">
              <span>{t('language')}</span>
              <span className="text-text-main uppercase">{settings.language}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save & Back CTA */}
      <div className="p-4 bg-bg-dark/90 backdrop-blur-md border-t border-border shrink-0">
        <button
          onClick={() => {
            playSound('click');
            onBack();
          }}
          className="w-full py-4 rounded-full bg-[#ec4899] hover:bg-[#db2777] text-white text-lg font-black shadow-[0_5px_0_#9d174d] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {t('saveBack')}
        </button>
      </div>

      {/* In-App Confirmation Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-bg-surface border border-border-strong rounded-[2rem] p-6 text-center shadow-2xl">
            <h3 className="text-lg font-black text-text-main mb-2">{t('alert')}</h3>
            <p className="text-sm font-bold text-text-muted mb-6 leading-relaxed">
              {pendingConfirm === 'scores' ? t('confirmResetScores') : t('confirmResetApp')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-bg-card border border-border text-text-main font-black"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
