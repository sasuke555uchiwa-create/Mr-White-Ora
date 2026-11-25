import React, { useState, useEffect } from 'react';
import {
  getRecentPlayers,
  saveRecentPlayers,
  overwriteRecentPlayers,
  RecentPlayer,
  getSettings,
} from '../services/storageService';
import { playSound } from '../services/soundService';
import {
  Plus,
  Save,
  UserPlus,
  X,
  Check,
  Moon,
  Sun,
  Upload,
  Type,
  Users,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { CHARACTER_AVATARS } from '../data/specialRoles';
import { compressAvatarImage } from '../utils/imageUtils';
import { showToast } from '../utils/toast';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  BottomActionBar,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

interface PlayerSetupProps {
  onNext?: (players: { name: string; avatar: string; isSleeping?: boolean }[]) => void;
  mode?: 'setup' | 'manage';
  onBack?: () => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({
  onNext,
  mode = 'setup',
  onBack,
}) => {
  const [players, setPlayers] = useState<{ name: string; avatar: string; isSleeping?: boolean }[]>(
    []
  );
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);

  useEffect(() => {
    const saved = getRecentPlayers();
    setRecentPlayers(saved);

    if (saved.length > 0 && mode === 'manage') {
      setPlayers(saved);
    } else if (saved.length >= 3 && mode === 'setup') {
      setPlayers(
        saved
          .filter((p) => !p.isSleeping)
          .slice(0, 8)
          .map((p) => ({ name: p.name, avatar: p.avatar }))
      );
    } else {
      setPlayers([
        { name: '', avatar: '' },
        { name: '', avatar: '' },
        { name: '', avatar: '' },
      ]);
    }
  }, [mode]);

  const addPlayerField = () => {
    setPlayers([...players, { name: '', avatar: '' }]);
    playSound('click');
  };

  const removePlayerField = (index: number) => {
    const newPlayers = [...players];
    newPlayers.splice(index, 1);
    setPlayers(newPlayers);
    playSound('vote');
  };

  const toggleSleep = (index: number) => {
    const newPlayers = [...players];
    newPlayers[index].isSleeping = !newPlayers[index].isSleeping;
    setPlayers(newPlayers);
    playSound('click');
  };

  const handleNameChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = value;
    setPlayers(newPlayers);
  };

  const handleSelectRecentPlayer = (index: number, player: RecentPlayer) => {
    const newPlayers = [...players];
    newPlayers[index].name = player.name;
    newPlayers[index].avatar = player.avatar;
    setPlayers(newPlayers);
    setFocusedIndex(null);
    playSound('pop');
  };

  const handleQuickAdd = (player: RecentPlayer) => {
    const newPlayers = [...players];
    const emptySlotIndex = newPlayers.findIndex(
      (p) => p.name.trim() === '' && !p.isSleeping
    );

    if (emptySlotIndex !== -1) {
      newPlayers[emptySlotIndex].name = player.name;
      newPlayers[emptySlotIndex].avatar = player.avatar;
      setPlayers(newPlayers);
    } else {
      setPlayers([
        ...newPlayers,
        {
          name: player.name,
          avatar: player.avatar,
        },
      ]);
    }
    playSound('pop');
  };

  const handleAvatarSelect = (avatar: string) => {
    if (editingIndex !== null) {
      const newPlayers = [...players];
      newPlayers[editingIndex].avatar = avatar;
      setPlayers(newPlayers);
      setEditingIndex(null);
      playSound('click');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || editingIndex === null) return;

    try {
      const compressedBase64 = await compressAvatarImage(file, 256, 0.82);
      handleAvatarSelect(compressedBase64);
    } catch (err: any) {
      if (err?.message === 'FILE_TOO_LARGE') {
        showToast(t('imageTooLarge'), 'error');
      } else {
        showToast(
          isRTL
            ? 'تعذر معالجة الصورة. الرجاء اختيار صورة أخرى.'
            : 'Could not process image. Please choose another file.',
          'error'
        );
      }
    }
  };

  const normalizedNames = players
    .map((p) => p.name.trim().toLowerCase())
    .filter((n) => n.length > 0);
  const nameCounts = normalizedNames.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const hasDuplicates = Object.values(nameCounts).some((count) => count > 1);

  const duplicateMsg = isRTL
    ? 'لا يمكن تكرار نفس الاسم لأكثر من لاعب (لتفادي تداخل النقاط).'
    : 'Player names must be unique so scores do not collide.';

  const handleSaveAndBack = () => {
    if (hasDuplicates) {
      showToast(duplicateMsg, 'warning');
      playSound('pop');
      return;
    }
    const validPlayers = players.filter((p) => p.name.trim().length > 0);
    if (mode === 'manage') {
      overwriteRecentPlayers(validPlayers);
    } else {
      saveRecentPlayers(validPlayers);
    }
    playSound('click');
    if (onBack) onBack();
  };

  const handleNextStep = () => {
    if (hasDuplicates) {
      showToast(duplicateMsg, 'warning');
      playSound('pop');
      return;
    }
    if (isValid && onNext) {
      playSound('click');
      onNext(players.filter((p) => p.name.trim().length > 0));
    }
  };

  const activeCount = players.filter(
    (p) => p.name.trim().length > 0 && !p.isSleeping
  ).length;
  const isValid = activeCount >= 3 && !hasDuplicates;

  const unselectedRecentPlayers = recentPlayers.filter(
    (rp) =>
      !players.some((p) => p.name.trim().toLowerCase() === rp.name.toLowerCase()) &&
      !rp.isSleeping
  );

  return (
    <div className="flex flex-col min-h-full relative px-4 sm:px-6 pt-3 max-w-3xl mx-auto w-full pb-0">
      <BlacksiteScreenBackdrop bgKey="setup" texture="map" />
      <div className="relative z-10 flex flex-col flex-1">
      {/* Header Summary */}
      <DossierHeaderBand
        accent="cyan"
        texture="map"
        className="mb-4"
        icon={<Users size={20} />}
        title={mode === 'manage' ? t('managePlayers') : t('whoIsPlaying')}
        subtitle={
          mode === 'manage'
            ? t('editDeletePlayers')
            : isRTL
            ? 'أدخل أسماء العملاء واختر ملفاتهم التعريفية'
            : 'Enter operative callsigns and select portraits'
        }
        action={
          mode === 'setup' ? (
            <div className="flex items-center gap-2">
              <StatusIndicator tone={isValid ? 'emerald' : 'crimson'}>
                {t('count')} {activeCount}
              </StatusIndicator>
              {!isValid && (
                <span className="text-xs font-bold text-danger-text">{t('atLeast3')}</span>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Quick Add Recent Players */}
      {unselectedRecentPlayers.length > 0 && mode === 'setup' && (
        <IntelligencePanel className="mb-4 p-3.5">
          <p className="text-xs font-bold text-text-muted mb-2.5">
            {isRTL ? 'إضافة سريعة من العملاء المسجلين' : 'Quick add registered operatives'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unselectedRecentPlayers.map((player) => (
              <InteractiveCard
                key={player.name}
                onClick={() => handleQuickAdd(player)}
                className="px-3 py-1.5 rounded-[9px] text-xs font-bold flex items-center gap-2 min-h-[44px]"
              >
                <Avatar avatar={player.avatar} name={player.name} size={24} />
                <span>{player.name}</span>
                <Plus size={13} className="text-cyan-text" />
              </InteractiveCard>
            ))}
          </div>
        </IntelligencePanel>
      )}

      {/* Duplicate Name Warning */}
      {hasDuplicates && (
        <div className="mb-3 px-4 py-2.5 rounded-[10px] bg-[#963F46]/15 border border-[#963F46]/45 text-danger-text text-xs font-bold text-center">
          {duplicateMsg}
        </div>
      )}

      {/* Unified Operative Roster Sheet */}
      <IntelligencePanel className="p-3 sm:p-4 space-y-2.5 w-full flex flex-col">
        {players.map((player, index) => {
          if (mode === 'setup' && player.isSleeping) return null;

          const trimmedLower = player.name.trim().toLowerCase();
          const isDuplicateRow = Boolean(trimmedLower && nameCounts[trimmedLower] > 1);

          const otherPlayerNames = players
            .filter((_, i) => i !== index)
            .map((p) => p.name);
          const suggestions = recentPlayers.filter(
            (rp) =>
              rp.name.toLowerCase().includes(player.name.toLowerCase()) &&
              rp.name !== player.name &&
              !otherPlayerNames.includes(rp.name) &&
              !rp.isSleeping
          );

          return (
            <PlayerIntelligenceCard
              key={index}
              className={`px-3 py-2 flex items-center gap-2.5 sm:gap-3 relative focus-within:border-[#668F9A] ${
                isDuplicateRow ? 'border-[#963F46] bg-[#963F46]/10' : 'border-border bg-bg-card/90'
              } ${player.isSleeping ? 'opacity-50 grayscale' : ''}`}
              style={{ zIndex: focusedIndex === index ? 20 : 1 }}
            >
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setEditingIndex(index);
                }}
                title={t('changeAvatar')}
                aria-label={`${t('changeAvatar')} ${player.name || `${t('playerNumber')} ${index + 1}`}`}
                className="group relative rounded-full p-0.5 border border-border-strong hover:border-[#B49A62] transition-colors active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75"
              >
                <Avatar avatar={player.avatar} name={player.name} size={42} />
              </button>

              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={`${t('playerNumber')} ${index + 1}`}
                  value={player.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setTimeout(() => setFocusedIndex(null), 180)}
                  className="w-full bg-bg-input border border-border rounded-[9px] focus:border-[#668F9A] px-3 py-2 text-start text-sm sm:text-base outline-none text-text-main placeholder-text-muted font-bold transition-colors min-h-[44px]"
                  autoComplete="off"
                />

                {focusedIndex === index &&
                  suggestions.length > 0 &&
                  mode === 'setup' && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-bg-surface border border-border-strong rounded-[12px] shadow-2xl max-h-44 overflow-y-auto z-50">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectRecentPlayer(index, suggestion);
                          }}
                          className="w-full text-start px-3 py-2.5 text-text-main hover:bg-bg-card border-b border-border last:border-0 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              avatar={suggestion.avatar}
                              name={suggestion.name}
                              size={26}
                            />
                            <span className="text-sm font-bold">{suggestion.name}</span>
                          </div>
                          <span className="text-xs font-bold text-cyan-text flex items-center gap-1">
                            <Check size={12} />
                            {t('registered')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    playSound('click');
                    setEditingIndex(index);
                  }}
                  title={t('changeAvatar')}
                  aria-label={t('changeAvatar')}
                >
                  <BlacksiteIcon name="editPlayer" size={16} />
                </IconButton>
                {mode === 'manage' && (
                  <IconButton
                    size="sm"
                    variant={player.isSleeping ? 'primary' : 'ghost'}
                    onClick={() => toggleSleep(index)}
                    title={player.isSleeping ? t('wakeUp') : t('sleep')}
                    aria-label={player.isSleeping ? t('wakeUp') : t('sleep')}
                  >
                    {player.isSleeping ? <Sun size={16} /> : <Moon size={16} />}
                  </IconButton>
                )}
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => removePlayerField(index)}
                  disabled={players.length <= 1}
                  className="hover:bg-[#963F46]/15"
                  title="Remove player"
                  aria-label="Remove player"
                >
                  <BlacksiteIcon name="removePlayer" size={16} />
                </IconButton>
              </div>
            </PlayerIntelligenceCard>
          );
        })}

        <div className="pt-1.5">
          <TacticalButton
            variant="secondary"
            size="md"
            fullWidth
            onClick={addPlayerField}
            icon={<BlacksiteIcon name="addPlayer" size={17} />}
          >
            {t('addPlayer')}
          </TacticalButton>
        </div>
      </IntelligencePanel>

      {/* Bottom Sticky Action */}
      <BottomActionBar className="mt-auto pt-3">
        <div className="w-full max-w-md mx-auto">
          {mode === 'setup' ? (
            <TacticalButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isValid}
              onClick={handleNextStep}
              icon={<UserPlus size={18} />}
            >
              {t('saveContinue')}
            </TacticalButton>
          ) : (
            <TacticalButton
              variant="cyan"
              size="lg"
              fullWidth
              onClick={handleSaveAndBack}
              icon={<Save size={18} />}
            >
              {t('saveChanges')}
            </TacticalButton>
          )}
        </div>
      </BottomActionBar>

      {/* Character Avatar Selection Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-4">
          <ModalShell
            maxWidthClass="max-w-md"
            className="p-5 max-h-[88vh] flex flex-col"
            onClose={() => setEditingIndex(null)}
            ariaLabel={t('changeAvatar')}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
              <h3 className="text-base sm:text-lg font-extrabold text-text-main">
                {t('changeAvatar')}
              </h3>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => setEditingIndex(null)}
                aria-label={t('close')}
              >
                <X size={18} />
              </IconButton>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <div>
                <p className="text-xs font-bold text-text-muted mb-2.5">
                  {isRTL ? 'شخصيات الوكالة' : 'Agency Operatives'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {CHARACTER_AVATARS.map((char) => {
                    const isSelected = players[editingIndex]?.avatar === char.src;
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleAvatarSelect(char.src)}
                        className={`p-2 rounded-[10px] border flex flex-col items-center gap-1 transition-colors ${
                          isSelected
                            ? 'bg-[#668F9A]/15 border-[#668F9A]'
                            : 'bg-bg-card border-border hover:border-border-strong'
                        }`}
                      >
                        <img
                          src={char.src}
                          alt={char.label[lang] || char.label.en}
                          referrerPolicy="no-referrer"
                          className={`w-12 h-12 rounded-[8px] ${
                            char.id === 'wizard' ? 'object-contain' : 'object-cover'
                          }`}
                        />
                        <span className="text-[11px] font-bold text-text-main truncate max-w-full">
                          {char.label[lang] || char.label.en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border">
                <button
                  onClick={() => handleAvatarSelect('')}
                  className="p-3 rounded-[10px] bg-bg-card border border-border hover:border-[#668F9A]/50 flex items-center gap-2.5 transition-colors min-h-[48px]"
                >
                  <div className="w-9 h-9 rounded-[8px] bg-[#668F9A]/15 text-cyan-text flex items-center justify-center shrink-0">
                    <Type size={17} />
                  </div>
                  <div className="text-start min-w-0">
                    <p className="font-bold text-xs text-text-main truncate">
                      {t('useLetter')}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-[10px] bg-bg-card border border-border hover:border-[#B49A62]/50 flex items-center gap-2.5 transition-colors min-h-[48px]"
                >
                  <div className="w-9 h-9 rounded-[8px] bg-[#B49A62]/15 text-primary-text flex items-center justify-center shrink-0">
                    <Upload size={17} />
                  </div>
                  <div className="text-start min-w-0">
                    <p className="font-bold text-xs text-text-main truncate">
                      {t('uploadImage')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </ModalShell>
        </div>
      )}
      </div>
    </div>
  );
};
