import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineRoom } from '../hooks/useOnlineRoom';
import {
  beginOnlineMatch,
  getOnlineActionErrorKey,
  joinOnlineRoom,
  kickOnlinePlayer,
  leaveOnlineRoom,
  promoteOnlineHost,
  toggleOnlineReady,
  updateOnlineRoomSettings,
} from '../utils/onlineRoomService';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Users,
  Play,
  Copy,
  Check,
  Globe,
  Lock,
  X,
  MessageCircle,
  UserPlus,
  Crown,
  Share2,
  SlidersHorizontal,
  Clock,
  Eye,
  EyeOff,
  Minus,
  Plus,
} from 'lucide-react';
import { sendFriendRequest } from '../utils/friendService';
import { ChatBox } from './ChatBox';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { showToast } from '../utils/toast';

interface OnlineLobbyScreenProps {
  roomId: string;
  onBack: () => void;
  onStartGame: (roomData: any) => void;
}

export const OnlineLobbyScreen: React.FC<OnlineLobbyScreenProps> = ({
  roomId,
  onBack,
  onStartGame,
}) => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editDraft, setEditDraft] = useState({
    maxPlayers: 8,
    language: 'ar',
    category: 'standard',
    difficulty: 'easy' as 'easy' | 'hard',
    turnDurationSeconds: 45,
    isPrivate: false,
  });
  const isLeavingRef = useRef(false);
  const joinAttemptedRef = useRef(false);
  const [busyAction, setBusyAction] = useState(false);

  const settings = getSettings();
  const isRTL = ['ar', 'sa'].includes(settings.language);
  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(settings.language, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const { room, inviteMeta } = useOnlineRoom({
    roomId,
    user,
    isLeavingRef,
    subscribeInviteMeta: true,
    onRoomClosed: () => {
      showToast(t('roomClosedByHost'), 'warning');
      onBack();
    },
    onKicked: () => {
      showToast(t('kickedFromRoom'), 'error');
      onBack();
    },
    onHostPromoted: () => {
      showToast(t('hostPromoted'), 'info');
    },
    onOfflineLeave: () => {
      showToast(t('lostConnection'), 'error');
      onBack();
    },
  });

  useEffect(() => {
    if (!room || !user || isLeavingRef.current) return;
    if (room.status === 'playing' && room.gameState) {
      onStartGame(room);
    }
  }, [room, user, onStartGame]);

  // Safety join if navigated directly to lobby before joinRoom completed
  useEffect(() => {
    if (!room || !user || isLeavingRef.current || joinAttemptedRef.current) return;
    const currentPlayers: any[] = room.players || [];
    const isPlayerInRoom = currentPlayers.some((p: any) => p.uid === user.uid);
    if (isPlayerInRoom) return;

    joinAttemptedRef.current = true;
    joinOnlineRoom({ roomId })
      .then((res) => {
        if (!res.success && !isLeavingRef.current) {
          isLeavingRef.current = true;
          const msgKey =
            res.reason === 'kickedFromRoom'
              ? 'kickedFromRoom'
              : res.reason === 'roomFull' || res.reason === 'matchAlreadyStarted'
              ? 'roomFull'
              : 'roomNotFound';
          showToast(t(msgKey), 'warning');
          onBack();
        }
      })
      .catch(() => {
        if (!isLeavingRef.current) {
          isLeavingRef.current = true;
          onBack();
        }
      });
  }, [room, user, roomId, onBack]);

  const handleLeave = async () => {
    if (!room || !user || isLeavingRef.current) return;
    isLeavingRef.current = true;
    try {
      await leaveOnlineRoom(roomId, user.uid);
    } catch (error) {
      console.error('Failed to leave room cleanly:', error);
    } finally {
      onBack();
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!room || !user || room.hostId !== user.uid || busyAction) return;
    setBusyAction(true);
    try {
      await kickOnlinePlayer(roomId, playerId);
    } catch (error) {
      console.error('Kick failed:', error);
      showToast(t(getOnlineActionErrorKey(error)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handlePromoteHost = async (targetPlayer: any) => {
    if (!room || !user || room.hostId !== user.uid || targetPlayer.uid === user.uid || busyAction) {
      return;
    }
    setBusyAction(true);
    try {
      await promoteOnlineHost(roomId, targetPlayer.uid);
    } catch (error) {
      console.error('Promote host failed:', error);
      showToast(t(getOnlineActionErrorKey(error)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleReady = async () => {
    if (!room || !user || busyAction) return;
    setBusyAction(true);
    try {
      await toggleOnlineReady(roomId);
    } catch (error) {
      console.error('Toggle ready failed:', error);
      showToast(t(getOnlineActionErrorKey(error)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || !user || room.hostId !== user.uid || busyAction) return;
    setBusyAction(true);
    try {
      await beginOnlineMatch(roomId);
    } catch (error) {
      console.error('Begin match failed:', error);
      showToast(t(getOnlineActionErrorKey(error)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSendFriendRequest = async (toId: string) => {
    if (!user) return;
    const result = await sendFriendRequest(user.uid, toId);
    showToast(t(result.message), result.success ? 'success' : 'info');
  };

  const roomSecretCode = inviteMeta?.secretCode || room?.secretCode || '------';

  const copyCode = async () => {
    if (!inviteMeta?.secretCode && !room?.secretCode) return;
    try {
      await navigator.clipboard.writeText(roomSecretCode);
      setCopied(true);
      showToast(t('codeCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t('codeCopied'), 'info');
    }
  };

  const shareRoom = async () => {
    if (!inviteMeta?.secretCode && !room?.secretCode) return;
    const shareText = `${t('roomCodeLabel')}: ${roomSecretCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Undercover', text: shareText });
        return;
      } catch {
        // Fallback to copy
      }
    }
    copyCode();
  };

  const openEditSettings = () => {
    if (!room) return;
    setEditDraft({
      maxPlayers: room.maxPlayers || 8,
      language: room.language || 'ar',
      category: room.category || 'standard',
      difficulty: room.difficulty || 'easy',
      turnDurationSeconds: room.turnDurationSeconds || 45,
      isPrivate: Boolean(room.isPrivate),
    });
    setShowEditSettings(true);
  };

  const saveEditSettings = async () => {
    if (!room || !user || room.hostId !== user.uid || busyAction) return;
    const minAllowed = Math.max(3, room.players?.length || 3);
    const safeMax = Math.max(minAllowed, Math.min(10, editDraft.maxPlayers));
    setBusyAction(true);
    try {
      await updateOnlineRoomSettings(roomId, {
        maxPlayers: safeMax,
        language: editDraft.language,
        category: editDraft.category,
        difficulty: editDraft.difficulty,
        turnDurationSeconds: editDraft.turnDurationSeconds,
        isPrivate: editDraft.isPrivate,
      });
      setShowEditSettings(false);
    } catch (error) {
      console.error('Update room settings failed:', error);
      showToast(t(getOnlineActionErrorKey(error)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isHost = user?.uid === room.hostId;
  const playersArr: any[] = room.players || [];
  const allReady = playersArr.every((p: any) => p.isReady || p.uid === room.hostId);
  const canStart = isHost && playersArr.length >= 3 && allReady;
  const emptySlotsCount = Math.max(0, (room.maxPlayers || 8) - playersArr.length);

  const categoryLabels: Record<string, string> = {
    standard: t('standardWords'),
    animals: t('animals'),
    food: t('food'),
    places: isRTL ? 'أماكن ومعالم' : t('catPlaces'),
    objects: isRTL ? 'أشياء وأدوات' : t('catObjects'),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col bg-bg-dark p-4 max-w-3xl mx-auto w-full pb-24 relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeave}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center card-modern"
          aria-label={t('leaveRoom')}
        >
          <ArrowRight className={`w-6 h-6 ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        <div className="text-center min-w-0 px-2">
          <h2 className="text-xl sm:text-2xl font-black drop-shadow-sm truncate">
            {t('waitingRoom')}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted font-bold truncate">
            {t('hostLabel')} {room.hostName}
          </p>
        </div>
        <button
          onClick={() => setShowChat(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center card-modern relative"
          aria-label={t('chat')}
        >
          <MessageCircle className="w-6 h-6" />
          {room.messages?.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-bg-dark"></span>
          )}
        </button>
      </div>

      {/* Room Code & Live Settings Card */}
      <div className="card-modern p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] text-text-muted mb-0.5 font-bold uppercase tracking-wider">
              {t('roomCodeLabel')}
            </p>
            <p className="text-2xl font-black tracking-widest drop-shadow-sm text-primary tabular-nums" dir="ltr">
              {roomSecretCode}
            </p>
          </div>
          <button
            onClick={copyCode}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-white transition-colors border border-primary/30"
            aria-label={t('codeCopied')}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={shareRoom}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/5 text-text-main rounded-xl hover:bg-white/10 transition-colors border border-white/10"
            aria-label={t('shareRoom')}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-text-muted">
          <span className="px-2.5 py-1 rounded-lg bg-bg-dark border border-white/10 flex items-center gap-1">
            <Globe size={12} />
            {(room.language || 'ar').toUpperCase()}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-dark border border-white/10 flex items-center gap-1">
            {room.isPrivate ? (
              <Lock size={12} className="text-accent" />
            ) : (
              <Globe size={12} className="text-emerald-400" />
            )}
            {room.isPrivate ? t('privateRoom') : t('publicRoom')}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg bg-bg-dark border border-white/10 ${
              room.difficulty === 'hard' ? 'text-rose-400' : 'text-sky-400'
            }`}
          >
            {room.difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-dark border border-white/10">
            {categoryLabels[room.category || 'standard'] || t('standardWords')}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-dark border border-white/10 flex items-center gap-1 tabular-nums">
            <Clock size={12} className="text-amber-400" />
            {room.turnDurationSeconds || 45}
            {t('secondsShort')}
          </span>
          {isHost && (
            <button
              onClick={openEditSettings}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/40 flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal size={13} />
              <span>{t('editRoomSettings')}</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] font-bold text-text-muted px-2 mb-4 text-center">
        {t('onlineClassicRolesNote')}
      </p>

      {/* Players List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-black text-lg sm:text-xl flex items-center gap-2 drop-shadow-sm">
            <Users className="w-5 h-5 text-primary" />
            {t('playersList')}
          </h3>
          <span className="text-text-muted font-black tabular-nums" dir="ltr">
            {playersArr.length} / {room.maxPlayers}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {playersArr.map((player: any) => {
            const isCardHost = player.uid === room.hostId;
            return (
              <div
                key={player.uid}
                className="card-modern p-3 flex flex-col items-center text-center relative overflow-hidden group"
              >
                {isCardHost && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg z-10 shadow-sm">
                    {t('host')}
                  </div>
                )}

                {isHost && !isCardHost && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                    <button
                      onClick={() => handlePromoteHost(player)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-amber-500/20 text-amber-300 rounded-full hover:bg-amber-500 hover:text-slate-950 active:scale-95 transition-all border border-amber-400/40"
                      title={t('promoteToHost')}
                      aria-label={t('promoteToHost')}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleKickPlayer(player.uid)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-danger/25 text-danger rounded-full hover:bg-danger hover:text-white active:scale-95 transition-all border border-danger/40"
                      title={t('kickPlayer')}
                      aria-label={t('kickPlayer')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {player.uid !== user?.uid && (
                  <button
                    onClick={() => handleSendFriendRequest(player.uid)}
                    className="absolute top-1.5 left-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center bg-primary/25 text-primary rounded-full hover:bg-primary hover:text-white active:scale-95 transition-all z-10 border border-primary/40"
                    title={t('sendFriendRequest')}
                    aria-label={t('sendFriendRequest')}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="mt-4">
                  <Avatar
                    avatar={player.avatar}
                    name={player.name}
                    size={62}
                    showName={true}
                    status={isCardHost ? 'none' : player.isReady ? 'ready' : 'waiting'}
                    badge={
                      isCardHost ? (
                        <div className="bg-yellow-400 p-1 rounded-full border-2 border-white shadow-sm">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : player.isReady ? (
                        <div className="bg-emerald-500 p-1 rounded-full border-2 border-white shadow-sm">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : null
                    }
                  />
                </div>
              </div>
            );
          })}

          {/* Empty Slots */}
          {Array.from({ length: emptySlotsCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="card-modern p-3 flex flex-col items-center justify-center border border-dashed border-white/20 opacity-50 min-h-[128px]"
            >
              <div className="w-14 h-14 rounded-full bg-bg-dark mb-2 border border-white/10 shadow-inner"></div>
              <p className="text-xs font-bold text-text-muted">{t('waitingForPlayer')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className={`btn-modern w-full min-h-[54px] py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 tracking-wide text-base ${
              canStart ? '' : 'opacity-50 grayscale cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5" />
            {playersArr.length < 3
              ? t('needAtLeast3Players')
              : !allReady
              ? t('waitingForPlayersReady')
              : t('startGame')}
          </button>
        ) : (
          <button
            onClick={handleToggleReady}
            className={`btn-modern w-full min-h-[54px] py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 tracking-wide text-base ${
              playersArr.find((p: any) => p.uid === user?.uid)?.isReady ? 'btn-modern-accent' : ''
            }`}
          >
            <Check className="w-5 h-5" />
            {playersArr.find((p: any) => p.uid === user?.uid)?.isReady
              ? t('cancelReady')
              : t('imReady')}
          </button>
        )}
      </div>

      {/* Live Edit Settings Modal (Host Only) */}
      {showEditSettings && isHost && (
        <div className="fixed inset-0 bg-bg-dark/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-modern p-6 w-full max-w-md my-auto max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-black mb-5 text-center">{t('editRoomSettings')}</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('numberOfPlayers')}
                </label>
                <div className="flex items-center justify-between bg-bg-dark border border-white/10 rounded-2xl p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditDraft((prev) => ({
                        ...prev,
                        maxPlayers: Math.max(Math.max(3, playersArr.length), prev.maxPlayers - 1),
                      }))
                    }
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-xl font-black tabular-nums">{editDraft.maxPlayers}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditDraft((prev) => ({
                        ...prev,
                        maxPlayers: Math.min(10, prev.maxPlayers + 1),
                      }))
                    }
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('gameLanguage')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'ar', label: t('standardArabic') },
                    { code: 'en', label: t('english') },
                    { code: 'fr', label: t('french') },
                    { code: 'es', label: t('spanish') },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setEditDraft({ ...editDraft, language: item.code })}
                      className={`min-h-[44px] rounded-xl font-black text-xs border ${
                        editDraft.language === item.code
                          ? 'bg-primary text-white border-primary/60'
                          : 'bg-bg-dark text-text-muted border-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('wordCategory')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditDraft({ ...editDraft, category: cat })}
                      className={`min-h-[44px] px-3 rounded-xl font-black text-xs border truncate ${
                        editDraft.category === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                          : 'bg-bg-dark text-text-muted border-white/5'
                      } ${cat === 'standard' ? 'col-span-2' : ''}`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('difficulty')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, difficulty: 'easy' })}
                    className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border ${
                      editDraft.difficulty === 'easy'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400/60'
                        : 'bg-bg-dark text-text-muted border-white/5'
                    }`}
                  >
                    <Eye size={14} />
                    {t('difficultyEasy')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, difficulty: 'hard' })}
                    className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border ${
                      editDraft.difficulty === 'hard'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/60'
                        : 'bg-bg-dark text-text-muted border-white/5'
                    }`}
                  >
                    <EyeOff size={14} />
                    {t('difficultyHard')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('turnDuration')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setEditDraft({ ...editDraft, turnDurationSeconds: sec })}
                      className={`min-h-[44px] rounded-xl font-black text-xs tabular-nums border ${
                        editDraft.turnDurationSeconds === sec
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                          : 'bg-bg-dark text-text-muted border-white/5'
                      }`}
                    >
                      {sec}
                      {t('secondsShort')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  {t('roomType')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, isPrivate: false })}
                    className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border ${
                      !editDraft.isPrivate
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-bg-dark text-text-muted border-white/5'
                    }`}
                  >
                    <Globe size={14} />
                    {t('public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDraft({ ...editDraft, isPrivate: true })}
                    className={`flex-1 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border ${
                      editDraft.isPrivate
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg-dark text-text-muted border-white/5'
                    }`}
                  >
                    <Lock size={14} />
                    {t('private')}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditSettings(false)}
                className="btn-modern btn-modern-outline flex-1 min-h-[48px] rounded-2xl"
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveEditSettings}
                className="btn-modern flex-1 min-h-[48px] rounded-2xl"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Chat Modal */}
      <ChatBox
        roomId={roomId}
        messages={room.messages || []}
        currentUser={user}
        currentProfile={profile}
        showChat={showChat}
        setShowChat={setShowChat}
      />
    </motion.div>
  );
};
