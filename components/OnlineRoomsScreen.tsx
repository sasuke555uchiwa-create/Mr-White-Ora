import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import {
  isOnlineBackendUnavailableError,
  joinOnlineRoom,
  quickJoinOnlineRoom,
} from '../utils/onlineRoomService';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Plus, Globe, Lock, EyeOff, Eye, Zap, Clock, Minus } from 'lucide-react';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { showToast } from '../utils/toast';
import {
  BottomActionBar,
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  SegmentedControl,
  TacticalButton,
  TacticalInput,
} from './ui/BlacksiteUI';

interface Room {
  id: string;
  hostName: string;
  hostAvatar: string;
  maxPlayers: number;
  players: any[];
  language: string;
  category?: string;
  difficulty?: 'easy' | 'hard';
  turnDurationSeconds?: number;
  hasSecretCode?: boolean;
  isPrivate?: boolean;
  status: string;
}

interface OnlineRoomsScreenProps {
  onBack: () => void;
  onCreateRoom: (settings: {
    maxPlayers: number;
    language: string;
    isPrivate: boolean;
    category: string;
    difficulty: 'easy' | 'hard';
    turnDurationSeconds: number;
  }) => void;
  onJoinRoom: (roomId: string) => void;
  currentLanguage: string;
}

type RoomFilter = 'all' | 'open' | 'large';

export const OnlineRoomsScreen: React.FC<OnlineRoomsScreenProps> = ({
  onBack,
  onCreateRoom,
  onJoinRoom,
  currentLanguage,
}) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RoomFilter>('all');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [newRoomSettings, setNewRoomSettings] = useState({
    maxPlayers: 8,
    language: currentLanguage || 'ar',
    isPrivate: false,
    category: 'standard',
    difficulty: 'easy' as 'easy' | 'hard',
    turnDurationSeconds: 45,
  });

  const isRTL = ['ar', 'sa'].includes(currentLanguage);
  const t = (key: string) => getUITranslation(currentLanguage, key);

  const categoryLabels: Record<string, string> = {
    standard: t('standardWords'),
    animals: t('animals'),
    food: t('food'),
    places: isRTL ? 'أماكن ومعالم' : t('catPlaces'),
    objects: isRTL ? 'أشياء وأدوات' : t('catObjects'),
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'rooms'),
      where('isPrivate', '==', false),
      where('status', '==', 'waiting'),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const roomData: Room[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.isPrivate) {
            roomData.push({ id: docSnap.id, ...data } as Room);
          }
        });
        roomData.sort((a, b) => {
          const timeA = (a as any).createdAt?.toMillis?.() || 0;
          const timeB = (b as any).createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setRooms(roomData);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'rooms');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredRooms = useMemo(() => {
    if (activeFilter === 'open') {
      return rooms.filter((r) => (r.players?.length || 0) < (r.maxPlayers || 8));
    }
    if (activeFilter === 'large') {
      return rooms.filter((r) => (r.maxPlayers || 8) >= 6);
    }
    return rooms;
  }, [rooms, activeFilter]);

  if (!user) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 text-center text-text-main">
        <IntelligencePanel className="max-w-sm w-full p-6 space-y-4">
          <h2 className="text-xl font-extrabold">{t('loginRequired')}</h2>
          <p className="text-sm text-text-muted leading-relaxed">{t('mustLoginToPlayOnline')}</p>
          <TacticalButton variant="primary" fullWidth onClick={onBack}>
            {t('backToHome')}
          </TacticalButton>
        </IntelligencePanel>
      </div>
    );
  }

  const handleQuickJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const res = await quickJoinOnlineRoom();
      if (res.success && res.roomId) {
        onJoinRoom(res.roomId);
      } else {
        showToast(t('noOpenRoomsForQuickJoin'), 'info');
      }
    } catch (error) {
      console.warn('Quick join error:', error);
      const msgKey = isOnlineBackendUnavailableError(error) ? 'onlineBackendUnavailable' : 'searchError';
      showToast(t(msgKey), 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code || joining) return;

    setJoining(true);
    setJoinError(null);

    try {
      const res = await joinOnlineRoom({ secretCode: code });
      if (res.success && res.roomId) {
        onJoinRoom(res.roomId);
      } else {
        const msgKey =
          res.reason === 'roomFull'
            ? 'roomFull'
            : res.reason === 'kickedFromRoom'
            ? 'kickedFromRoom'
            : 'roomNotFound';
        const msg = t(msgKey);
        setJoinError(msg);
        showToast(msg, 'warning');
      }
    } catch (error) {
      console.warn('Error joining room by code:', error);
      const msgKey = isOnlineBackendUnavailableError(error) ? 'onlineBackendUnavailable' : 'searchError';
      const msg = t(msgKey);
      setJoinError(msg);
      showToast(msg, 'error');
    } finally {
      setJoining(false);
    }
  };

  const filterTabs: { value: RoomFilter; label: string }[] = [
    { value: 'all', label: isRTL ? 'الكل' : 'All' },
    { value: 'open', label: isRTL ? 'أماكن متاحة' : 'Open Slots' },
    { value: 'large', label: t('extended') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex flex-col px-4 sm:px-6 pt-4 max-w-3xl mx-auto w-full min-h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <IconButton onClick={onBack} aria-label={t('back')} variant="secondary">
          <ArrowRight className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
        </IconButton>
        <h2 className="text-lg sm:text-xl font-extrabold text-text-main truncate">
          {t('publicRooms')}
        </h2>
        <TacticalButton
          variant="cyan"
          size="sm"
          onClick={handleQuickJoin}
          disabled={loading}
          loading={joining}
          icon={<Zap size={15} />}
        >
          {t('quickJoin')}
        </TacticalButton>
      </div>

      {/* Join by 6-digit Code */}
      <form
        onSubmit={handleJoinWithCode}
        className="rounded-[12px] blacksite-panel p-1.5 flex items-center gap-2 mb-3"
      >
        <TacticalInput
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('joinByCodePlaceholder')}
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.replace(/\D/g, ''));
            if (joinError) setJoinError(null);
          }}
          className="flex-1 px-3 py-2 font-mono-code font-bold tracking-widest tabular-nums placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-text-muted/70 text-start"
        />
        <IconButton
          type="submit"
          variant="primary"
          disabled={joining || joinCode.trim().length < 4}
          aria-label={t('joinByCodePlaceholder')}
        >
          <Search className="w-4 h-4" />
        </IconButton>
      </form>
      {joinError && (
        <p className="text-xs font-bold text-danger-text text-center mb-3">{joinError}</p>
      )}

      {/* Filter Tabs */}
      <SegmentedControl<RoomFilter>
        options={filterTabs}
        value={activeFilter}
        onChange={setActiveFilter}
        className="w-full mb-4"
      />

      {/* Rooms List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 flex-1 content-start">
        {loading ? (
          <div className="sm:col-span-2 flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#B49A62] border-t-transparent" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <IntelligencePanel className="sm:col-span-2 text-center py-12 p-6 border-dashed">
            <Globe className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-55" />
            <p className="font-bold text-text-main text-sm">{t('noRoomsAvailable')}</p>
            <p className="text-xs text-text-muted mt-1">{t('beFirstToCreate')}</p>
          </IntelligencePanel>
        ) : (
          filteredRooms.map((room) => {
            const catTitle = categoryLabels[room.category || 'standard'] || categoryLabels.standard;
            const isHard = room.difficulty === 'hard';
            const currentCount = room.players?.length || 0;
            const maxPlayers = room.maxPlayers || 8;
            const isFull = currentCount >= maxPlayers;
            const turnDuration = room.turnDurationSeconds || 45;

            return (
              <InteractiveCard
                key={room.id}
                accent="cyan"
                onClick={() => onJoinRoom(room.id)}
                disabled={isFull}
                className="w-full p-4 flex flex-col justify-between gap-3 text-start hover:border-[#668F9A]/60"
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar avatar={room.hostAvatar || ''} name={room.hostName} size={44} />
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base flex items-center gap-1.5 truncate">
                        <span className="truncate">{room.hostName}</span>
                        {(room.hasSecretCode || room.isPrivate) && (
                          <Lock className="w-3.5 h-3.5 text-primary-text shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-text-muted font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{catTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span className={isHard ? 'text-danger-text font-bold' : 'text-cyan-text font-bold'}>
                          {isHard ? t('difficultyHard') : t('difficultyEasy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ClassifiedStamp tone="neutral">
                    {(room.language || 'ar').toUpperCase()}
                  </ClassifiedStamp>
                </div>

                <div className="flex items-center justify-between w-full pt-2.5 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {(room.players || []).slice(0, 4).map((p: any, idx: number) => (
                        <div key={p.uid || idx} className="rounded-full ring-2 ring-bg-card">
                          <Avatar avatar={p.avatar} name={p.name} size={24} />
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
                      <Clock size={12} />
                      <span className="font-mono-code tabular-nums">
                        {turnDuration}
                        {t('secondsShort')}
                      </span>
                    </span>
                  </div>
                  <div
                    className={`font-mono-code font-bold text-xs tabular-nums ${
                      isFull ? 'text-danger-text' : 'text-emerald-text'
                    }`}
                    dir="ltr"
                  >
                    {currentCount}/{maxPlayers}
                  </div>
                </div>
              </InteractiveCard>
            );
          })
        )}
      </div>

      {/* Create Room Button */}
      <BottomActionBar className="mt-auto">
        <TacticalButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => setShowCreateModal(true)}
          icon={<Plus className="w-5 h-5" />}
        >
          {t('createNewRoom')}
        </TacticalButton>
      </BottomActionBar>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-[#080B10]/85 flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto"
          >
            <ModalShell
              maxWidthClass="max-w-md"
              onClose={() => setShowCreateModal(false)}
              ariaLabel={t('roomSettings')}
              className="p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-extrabold mb-4 text-center text-text-main">
                {t('roomSettings')}
              </h3>

              <div className="space-y-4 mb-6">
                {/* Player Stepper */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('numberOfPlayers')}
                  </label>
                  <div className="flex items-center justify-between blacksite-card rounded-[10px] p-1.5">
                    <IconButton
                      onClick={() =>
                        setNewRoomSettings((prev) => ({
                          ...prev,
                          maxPlayers: Math.max(3, prev.maxPlayers - 1),
                        }))
                      }
                      variant="secondary"
                      aria-label="Decrease players"
                    >
                      <Minus size={16} />
                    </IconButton>
                    <span className="text-xl font-extrabold font-mono-code tabular-nums text-text-main">
                      {newRoomSettings.maxPlayers}
                    </span>
                    <IconButton
                      onClick={() =>
                        setNewRoomSettings((prev) => ({
                          ...prev,
                          maxPlayers: Math.min(10, prev.maxPlayers + 1),
                        }))
                      }
                      variant="secondary"
                      aria-label="Increase players"
                    >
                      <Plus size={16} />
                    </IconButton>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('gameLanguage')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'ar', label: t('standardArabic') },
                      { code: 'en', label: t('english') },
                      { code: 'fr', label: t('french') },
                      { code: 'es', label: t('spanish') },
                    ].map((item) => (
                      <InteractiveCard
                        key={item.code}
                        selected={newRoomSettings.language === item.code}
                        accent="gold"
                        onClick={() => setNewRoomSettings({ ...newRoomSettings, language: item.code })}
                        className={`py-2 px-3 font-bold text-xs sm:text-sm ${
                          newRoomSettings.language === item.code
                            ? 'text-primary-text'
                            : 'text-text-muted'
                        }`}
                      >
                        {item.label}
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                {/* Word Category */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('wordCategory')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                      <InteractiveCard
                        key={cat}
                        selected={newRoomSettings.category === cat}
                        accent="cyan"
                        onClick={() => setNewRoomSettings({ ...newRoomSettings, category: cat })}
                        className={`py-2 px-3 font-bold text-xs truncate ${
                          newRoomSettings.category === cat ? 'text-cyan-text' : 'text-text-muted'
                        } ${cat === 'standard' ? 'col-span-2' : ''}`}
                      >
                        {categoryLabels[cat]}
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('difficulty')}
                  </label>
                  <div className="flex gap-2">
                    <InteractiveCard
                      selected={newRoomSettings.difficulty === 'easy'}
                      accent="cyan"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, difficulty: 'easy' })}
                      className={`flex-1 py-2 px-3 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        newRoomSettings.difficulty === 'easy'
                          ? 'text-cyan-text'
                          : 'text-text-muted'
                      }`}
                    >
                      <Eye size={14} />
                      <span>{t('difficultyEasy')}</span>
                    </InteractiveCard>
                    <InteractiveCard
                      selected={newRoomSettings.difficulty === 'hard'}
                      accent="crimson"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, difficulty: 'hard' })}
                      className={`flex-1 py-2 px-3 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        newRoomSettings.difficulty === 'hard'
                          ? 'text-danger-text'
                          : 'text-text-muted'
                      }`}
                    >
                      <EyeOff size={14} />
                      <span>{t('difficultyHard')}</span>
                    </InteractiveCard>
                  </div>
                </div>

                {/* Turn Timer */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('turnDuration')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map((sec) => (
                      <InteractiveCard
                        key={sec}
                        selected={newRoomSettings.turnDurationSeconds === sec}
                        accent="gold"
                        onClick={() =>
                          setNewRoomSettings({ ...newRoomSettings, turnDurationSeconds: sec })
                        }
                        className={`font-mono-code font-bold text-xs tabular-nums ${
                          newRoomSettings.turnDurationSeconds === sec
                            ? 'text-primary-text'
                            : 'text-text-muted'
                        }`}
                      >
                        {sec}
                        {t('secondsShort')}
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                {/* Privacy */}
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2">
                    {t('roomType')}
                  </label>
                  <div className="flex gap-2">
                    <InteractiveCard
                      selected={!newRoomSettings.isPrivate}
                      accent="emerald"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, isPrivate: false })}
                      className={`flex-1 py-2 font-bold flex items-center justify-center gap-2 text-xs sm:text-sm ${
                        !newRoomSettings.isPrivate ? 'text-emerald-text' : 'text-text-muted'
                      }`}
                    >
                      <Globe size={15} />
                      {t('public')}
                    </InteractiveCard>
                    <InteractiveCard
                      selected={newRoomSettings.isPrivate}
                      accent="gold"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, isPrivate: true })}
                      className={`flex-1 py-2 font-bold flex items-center justify-center gap-2 text-xs sm:text-sm ${
                        newRoomSettings.isPrivate ? 'text-primary-text' : 'text-text-muted'
                      }`}
                    >
                      <Lock size={15} />
                      {t('private')}
                    </InteractiveCard>
                  </div>
                </div>

                <p className="text-xs text-text-muted blacksite-card rounded-[10px] px-3.5 py-2.5 leading-relaxed">
                  {t('onlineClassicRolesNote')}
                </p>
              </div>

              <div className="flex gap-3">
                <TacticalButton
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  {t('cancel')}
                </TacticalButton>
                <TacticalButton
                  variant="primary"
                  onClick={() => {
                    setShowCreateModal(false);
                    onCreateRoom(newRoomSettings);
                  }}
                  className="flex-1"
                >
                  {t('create')}
                </TacticalButton>
              </div>
            </ModalShell>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
