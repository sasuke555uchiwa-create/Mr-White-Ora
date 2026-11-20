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
  Trash2,
  Save,
  UserPlus,
  X,
  Check,
  Pencil,
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
          lang === 'ar'
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

  const duplicateMsg =
    lang === 'ar'
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
    <div className="flex flex-col min-h-full animate-fade-in relative px-4 max-w-3xl mx-auto w-full pb-28">
      {/* Header Summary */}
      <div className="mb-4 mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-bg-surface/90 border border-border-strong rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-main">
              {mode === 'manage' ? t('managePlayers') : t('whoIsPlaying')}
            </h2>
            <p className="text-xs font-bold text-text-muted">
              {mode === 'manage'
                ? t('editDeletePlayers')
                : lang === 'ar'
                ? 'أدخل أسماء اللاعبين واختر شخصياتهم'
                : 'Enter player names and pick avatars'}
            </p>
          </div>
        </div>

        {mode === 'setup' && (
          <div className="text-xs sm:text-sm font-black tabular-nums flex items-center gap-2 text-text-muted">
            <span>{t('count')}</span>
            <span className={isValid ? 'text-emerald-400' : 'text-rose-400'}>
              {activeCount}
            </span>
            {!isValid && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400">{t('atLeast3')}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Add Recent Players */}
      {unselectedRecentPlayers.length > 0 && mode === 'setup' && (
        <div className="mb-4">
          <p className="text-xs font-bold text-text-muted mb-2">
            {lang === 'ar' ? 'إضافة سريعة من اللاعبين السابقين:' : 'Quick add recent players:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unselectedRecentPlayers.map((player) => (
              <button
                key={player.name}
                onClick={() => handleQuickAdd(player)}
                className="bg-bg-surface hover:bg-bg-card text-text-main px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-border-strong hover:border-sky-400/50 active:scale-95 flex items-center gap-2 shadow-sm"
              >
                <Avatar avatar={player.avatar} name={player.name} size={22} />
                <span>{player.name}</span>
                <Plus size={13} className="text-sky-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Name Warning */}
      {hasDuplicates && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-400/50 text-rose-200 text-xs font-black text-center">
          {duplicateMsg}
        </div>
      )}

      {/* Players Input Rows */}
      <div className="space-y-2.5 w-full flex flex-col">
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
            <div
              key={index}
              className={`bg-bg-surface/90 border rounded-2xl px-3 py-2.5 flex items-center gap-3 relative transition-all focus-within:border-sky-400 shadow-sm ${
                isDuplicateRow ? 'border-rose-500 bg-rose-500/10' : 'border-border-strong'
              } ${
                player.isSleeping ? 'opacity-50 grayscale' : ''
              }`}
              style={{ zIndex: focusedIndex === index ? 20 : 1 }}
            >
              <button
                onClick={() => {
                  playSound('click');
                  setEditingIndex(index);
                }}
                title={t('changeAvatar')}
                className="relative group/avatar active:scale-95 transition-transform shrink-0"
              >
                <Avatar avatar={player.avatar} name={player.name} size={46} />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-white border-2 border-bg-surface flex items-center justify-center shadow">
                  <Pencil size={11} />
                </div>
              </button>

              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={`${t('playerNumber')} ${index + 1}`}
                  value={player.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setTimeout(() => setFocusedIndex(null), 180)}
                  className="w-full bg-transparent border-b border-transparent focus:border-sky-400/60 py-1.5 text-start text-sm sm:text-base outline-none text-text-main placeholder-text-muted font-bold transition-colors"
                  autoComplete="off"
                />

                {focusedIndex === index &&
                  suggestions.length > 0 &&
                  mode === 'setup' && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-bg-surface border border-border-strong rounded-2xl shadow-2xl max-h-44 overflow-y-auto z-50">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectRecentPlayer(index, suggestion);
                          }}
                          className="w-full text-start px-3 py-2.5 text-text-main hover:bg-white/10 border-b border-border last:border-0 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              avatar={suggestion.avatar}
                              name={suggestion.name}
                              size={26}
                            />
                            <span className="text-sm font-bold">{suggestion.name}</span>
                          </div>
                          <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                            <Check size={12} />
                            {t('registered')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {mode === 'manage' && (
                  <button
                    onClick={() => toggleSleep(index)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors border ${
                      player.isSleeping
                        ? 'text-amber-400 bg-amber-500/15 border-amber-400/30'
                        : 'text-text-muted hover:text-amber-400 hover:bg-amber-500/10 border-transparent'
                    }`}
                    title={player.isSleeping ? t('wakeUp') : t('sleep')}
                  >
                    {player.isSleeping ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                )}
                <button
                  onClick={() => removePlayerField(index)}
                  disabled={players.length <= 1}
                  className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-30"
                  title="Remove player"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={addPlayerField}
          className="w-full py-3.5 border-2 border-dashed border-border-strong text-text-muted rounded-2xl text-sm font-black hover:bg-bg-surface/60 hover:text-text-main hover:border-sky-400/50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>{t('addPlayer')}</span>
        </button>
      </div>

      {/* Bottom Sticky Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-bg-dark via-bg-dark/95 to-transparent z-30 pointer-events-none flex justify-center">
        {mode === 'setup' ? (
          <button
            onClick={handleNextStep}
            disabled={!isValid}
            className={`w-full max-w-md py-3.5 rounded-full text-base sm:text-lg font-black flex items-center justify-center gap-2 transition-all pointer-events-auto ${
              isValid
                ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-[0_5px_0_#15803d] active:translate-y-0.5 active:shadow-none'
                : 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <UserPlus size={20} />
            <span>{t('saveContinue')}</span>
          </button>
        ) : (
          <button
            onClick={handleSaveAndBack}
            className="w-full max-w-md py-3.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-black flex items-center justify-center gap-2 text-base sm:text-lg shadow-[0_5px_0_#0369a1] active:translate-y-0.5 active:shadow-none transition-all pointer-events-auto"
          >
            <Save size={20} />
            <span>{t('saveChanges')}</span>
          </button>
        )}
      </div>

      {/* Character Avatar Selection Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-bg-surface border border-border-strong rounded-[2rem] p-5 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
              <h3 className="text-lg font-black text-text-main">{t('changeAvatar')}</h3>
              <button
                onClick={() => setEditingIndex(null)}
                className="w-9 h-9 rounded-full bg-bg-card text-text-muted hover:text-text-main flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Drive Character Avatars Grid */}
              <div>
                <p className="text-xs font-black text-text-muted mb-2.5">
                  {lang === 'ar' ? 'شخصيات اللعبة' : 'Game Characters'}
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {CHARACTER_AVATARS.map((char) => {
                    const isSelected = players[editingIndex]?.avatar === char.src;
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleAvatarSelect(char.src)}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 shadow-md'
                            : 'bg-bg-card border-border hover:border-border-strong'
                        }`}
                      >
                        <img
                          src={char.src}
                          alt={char.label[lang] || char.label.en}
                          referrerPolicy="no-referrer"
                          className={`w-12 h-12 rounded-xl ${
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

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border">
                <button
                  onClick={() => handleAvatarSelect('')}
                  className="p-3.5 rounded-2xl bg-bg-card border border-border hover:border-sky-400/50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                    <Type size={18} />
                  </div>
                  <div className="text-start min-w-0">
                    <p className="font-black text-xs text-text-main truncate">
                      {t('useLetter')}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-bg-card border border-border hover:border-emerald-400/50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <Upload size={18} />
                  </div>
                  <div className="text-start min-w-0">
                    <p className="font-black text-xs text-text-main truncate">
                      {t('uploadImage')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
