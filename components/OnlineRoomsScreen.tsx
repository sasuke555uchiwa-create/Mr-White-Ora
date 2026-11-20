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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-bg-dark text-text-main">
        <h2 className="text-2xl font-bold mb-4">{t('loginRequired')}</h2>
        <p className="text-text-muted mb-8">{t('mustLoginToPlayOnline')}</p>
        <button
          onClick={onBack}
          className="w-full max-w-xs py-4 bg-primary text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 hover:bg-primary-dark transition-colors"
        >
          {t('backToHome')}
        </button>
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
        const msgKey = res.reason === 'roomFull' ? 'roomFull' : res.reason === 'kickedFromRoom' ? 'kickedFromRoom' : 'roomNotFound';
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

  const filterTabs: { id: RoomFilter; label: string }[] = [
    { id: 'all', label: isRTL ? 'الكل' : 'All' },
    { id: 'open', label: isRTL ? 'أماكن متاحة' : 'Open Slots' },
    { id: 'large', label: t('extended') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col bg-bg-dark p-4 max-w-3xl mx-auto w-full pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center card-modern"
          aria-label={t('back')}
        >
          <ArrowRight className={`w-6 h-6 ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        <h2 className="text-xl font-black truncate">{t('publicRooms')}</h2>
        <button
          onClick={handleQuickJoin}
          disabled={loading}
          className="min-h-[44px] px-3.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-black text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
        >
          <Zap className="w-4 h-4" />
          <span>{t('quickJoin')}</span>
        </button>
      </div>

      {/* Join by 6-digit Code */}
      <form onSubmit={handleJoinWithCode} className="card-modern p-2 flex items-center gap-2 mb-3">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('joinByCodePlaceholder')}
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.replace(/\D/g, ''));
            if (joinError) setJoinError(null);
          }}
          className="flex-1 bg-transparent text-text-main px-4 py-2 font-black tracking-widest tabular-nums placeholder:tracking-normal placeholder:font-bold placeholder:text-text-muted/60 outline-none text-start"
        />
        <button
          type="submit"
          disabled={joining || joinCode.trim().length < 4}
          className="min-h-[44px] min-w-[44px] px-3.5 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center"
          aria-label={t('joinByCodePlaceholder')}
        >
          <Search className="w-5 h-5" />
        </button>
      </form>
      {joinError && (
        <p className="text-xs font-black text-rose-400 text-center mb-3">{joinError}</p>
      )}

      {/* Filter Tabs */}
      <div className="flex card-modern p-1 mb-5 text-xs sm:text-sm font-black gap-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 min-h-[44px] rounded-full transition-all ${
              activeFilter === tab.id
                ? 'text-white bg-primary shadow-md'
                : 'text-text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rooms List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {loading ? (
          <div className="sm:col-span-2 flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="sm:col-span-2 text-center py-12 text-text-muted card-modern p-6">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-bold">{t('noRoomsAvailable')}</p>
            <p className="text-sm mt-1">{t('beFirstToCreate')}</p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const catTitle = categoryLabels[room.category || 'standard'] || categoryLabels.standard;
            const isHard = room.difficulty === 'hard';
            const currentCount = room.players?.length || 0;
            const maxPlayers = room.maxPlayers || 8;
            const isFull = currentCount >= maxPlayers;
            const turnDuration = room.turnDurationSeconds || 45;

            return (
              <button
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                disabled={isFull}
                className={`w-full card-modern text-text-main p-4 flex flex-col justify-between gap-3 transition-all group text-start ${
                  isFull ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar avatar={room.hostAvatar || ''} name={room.hostName} size={46} />
                    <div className="min-w-0">
                      <div className="font-black text-base flex items-center gap-1.5 drop-shadow-sm truncate">
                        <span className="truncate">{room.hostName}</span>
                        {(room.hasSecretCode || room.isPrivate) && <Lock className="w-3 h-3 text-accent shrink-0" />}
                      </div>
                      <div className="text-xs text-text-muted font-bold flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{catTitle}</span>
                        <span>·</span>
                        <span className={isHard ? 'text-rose-400' : 'text-emerald-400'}>
                          {isHard ? t('difficultyHard') : t('difficultyEasy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-bg-dark flex items-center justify-center text-xs font-black border border-white/10 shadow-inner shrink-0">
                    {(room.language || 'ar').toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {(room.players || []).slice(0, 4).map((p: any, idx: number) => (
                        <div
                          key={p.uid || idx}
                          className="rounded-full ring-2 ring-bg-dark"
                        >
                          <Avatar avatar={p.avatar} name={p.name} size={24} />
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                      <Clock size={12} />
                      <span className="tabular-nums">
                        {turnDuration}
                        {t('secondsShort')}
                      </span>
                    </span>
                  </div>
                  <div
                    className={`font-black text-sm tabular-nums ${
                      isFull ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                    dir="ltr"
                  >
                    {currentCount}/{maxPlayers}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Create Room Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="btn-modern btn-modern-accent w-full py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 mt-auto"
      >
        <Plus className="w-6 h-6" />
        {t('createNewRoom')}
      </button>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-bg-dark/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-modern p-6 sm:p-7 w-full max-w-md my-auto max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-black mb-5 text-center drop-shadow-sm">
              {t('roomSettings')}
            </h3>

            <div className="space-y-5 mb-6">
              {/* Touch-Friendly Player Stepper */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('numberOfPlayers')}
                </label>
                <div className="flex items-center justify-between bg-bg-dark border border-white/10 rounded-2xl p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewRoomSettings((prev) => ({
                        ...prev,
                        maxPlayers: Math.max(3, prev.maxPlayers - 1),
                      }))
                    }
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-main"
                    aria-label="Decrease players"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-2xl font-black tabular-nums text-white">
                    {newRoomSettings.maxPlayers}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewRoomSettings((prev) => ({
                        ...prev,
                        maxPlayers: Math.min(10, prev.maxPlayers + 1),
                      }))
                    }
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-main"
                    aria-label="Increase players"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('gameLanguage')}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { code: 'ar', label: t('standardArabic') },
                    { code: 'en', label: t('english') },
                    { code: 'fr', label: t('french') },
                    { code: 'es', label: t('spanish') },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, language: item.code })}
                      className={`min-h-[44px] py-2 rounded-xl font-black text-sm transition-colors border ${
                        newRoomSettings.language === item.code
                          ? 'bg-primary text-white border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                          : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Category */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('wordCategory')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewRoomSettings({ ...newRoomSettings, category: cat })}
                      className={`min-h-[44px] py-2 px-3 rounded-xl font-black text-xs transition-colors border truncate ${
                        newRoomSettings.category === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                          : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                      } ${cat === 'standard' ? 'col-span-2' : ''}`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('difficulty')}
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewRoomSettings({ ...newRoomSettings, difficulty: 'easy' })}
                    className={`flex-1 min-h-[44px] py-2 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 border ${
                      newRoomSettings.difficulty === 'easy'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400/60'
                        : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <Eye size={15} />
                    <span>{t('difficultyEasy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomSettings({ ...newRoomSettings, difficulty: 'hard' })}
                    className={`flex-1 min-h-[44px] py-2 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 border ${
                      newRoomSettings.difficulty === 'hard'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/60'
                        : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <EyeOff size={15} />
                    <span>{t('difficultyHard')}</span>
                  </button>
                </div>
              </div>

              {/* Turn Timer */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('turnDuration')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() =>
                        setNewRoomSettings({ ...newRoomSettings, turnDurationSeconds: sec })
                      }
                      className={`min-h-[44px] rounded-xl font-black text-xs tabular-nums border transition-colors ${
                        newRoomSettings.turnDurationSeconds === sec
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                          : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {sec}
                      {t('secondsShort')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-bold text-text-muted mb-2">
                  {t('roomType')}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRoomSettings({ ...newRoomSettings, isPrivate: false })}
                    className={`flex-1 min-h-[44px] py-2 rounded-xl font-black transition-colors flex items-center justify-center gap-2 border text-sm ${
                      !newRoomSettings.isPrivate
                        ? 'bg-green-500 text-white border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <Globe size={16} />
                    {t('public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomSettings({ ...newRoomSettings, isPrivate: true })}
                    className={`flex-1 min-h-[44px] py-2 rounded-xl font-black transition-colors flex items-center justify-center gap-2 border text-sm ${
                      newRoomSettings.isPrivate
                        ? 'bg-accent text-white border-accent/50 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]'
                        : 'bg-bg-dark text-text-muted border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <Lock size={16} />
                    {t('private')}
                  </button>
                </div>
              </div>
              <p className="text-xs font-bold text-text-muted bg-bg-dark/70 border border-white/10 rounded-xl px-3.5 py-2.5 leading-relaxed">
                {t('onlineClassicRolesNote')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-modern btn-modern-outline flex-1 min-h-[48px] rounded-2xl"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  onCreateRoom(newRoomSettings);
                }}
                className="btn-modern flex-1 min-h-[48px] rounded-2xl"
              >
                {t('create')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
