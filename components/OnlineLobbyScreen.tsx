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
import {
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  ModalShell,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#B49A62] border-t-transparent" />
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

  const meReady = playersArr.find((p: any) => p.uid === user?.uid)?.isReady;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex flex-col p-4 max-w-3xl mx-auto w-full pb-24 relative min-h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <IconButton onClick={handleLeave} aria-label={t('leaveRoom')} variant="secondary">
          <ArrowRight className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
        </IconButton>
        <div className="text-center min-w-0 px-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-text-main truncate">
            {t('waitingRoom')}
          </h2>
          <p className="text-xs text-text-muted font-medium truncate">
            {t('hostLabel')} {room.hostName}
          </p>
        </div>
        <IconButton
          onClick={() => setShowChat(true)}
          aria-label={t('chat')}
          variant="secondary"
          className="relative"
        >
          <MessageCircle className="w-5 h-5" />
          {room.messages?.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B49A62] rounded-full" />
          )}
        </IconButton>
      </div>

      {/* Room Code & Live Settings Card */}
      <IntelligencePanel className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[11px] text-text-muted mb-0.5 font-bold">{t('roomCodeLabel')}</p>
            <p
              className="text-2xl font-extrabold font-mono-code tracking-widest text-primary-text tabular-nums"
              dir="ltr"
            >
              {roomSecretCode}
            </p>
          </div>
          <IconButton
            onClick={copyCode}
            variant="primary"
            aria-label={t('codeCopied')}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </IconButton>
          <IconButton
            onClick={shareRoom}
            variant="secondary"
            aria-label={t('shareRoom')}
          >
            <Share2 className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <ClassifiedStamp tone="neutral">
            {(room.language || 'ar').toUpperCase()}
          </ClassifiedStamp>
          <StatusIndicator
            tone={room.isPrivate ? 'gold' : 'emerald'}
            icon={room.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
          >
            {room.isPrivate ? t('privateRoom') : t('publicRoom')}
          </StatusIndicator>
          <StatusIndicator tone={room.difficulty === 'hard' ? 'crimson' : 'cyan'}>
            {room.difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
          </StatusIndicator>
          <StatusIndicator tone="neutral">
            {categoryLabels[room.category || 'standard'] || t('standardWords')}
          </StatusIndicator>
          <StatusIndicator tone="gold" icon={<Clock size={11} />}>
            {room.turnDurationSeconds || 45}
            {t('secondsShort')}
          </StatusIndicator>
          {isHost && (
            <TacticalButton
              variant="secondary"
              size="sm"
              onClick={openEditSettings}
              icon={<SlidersHorizontal size={13} />}
            >
              {t('editRoomSettings')}
            </TacticalButton>
          )}
        </div>
      </IntelligencePanel>
      <p className="text-[11px] font-medium text-text-muted px-2 mb-5 text-center">
        {t('onlineClassicRolesNote')}
      </p>

      {/* Players List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2 text-text-main">
            <Users className="w-5 h-5 text-primary-text" />
            {t('playersList')}
          </h3>
          <span className="text-text-muted font-mono-code font-bold text-sm tabular-nums" dir="ltr">
            {playersArr.length} / {room.maxPlayers}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {playersArr.map((player: any) => {
            const isCardHost = player.uid === room.hostId;
            return (
              <PlayerIntelligenceCard
                key={player.uid}
                className="p-3.5 flex flex-col items-center text-center relative overflow-hidden bg-bg-surface border-border-strong"
              >
                {isCardHost && (
                  <div className="absolute top-0 right-0 bg-[#B49A62] text-[#080B10] text-[10px] font-extrabold px-2 py-0.5 rounded-bl-[8px] z-10">
                    {t('host')}
                  </div>
                )}

                {isHost && !isCardHost && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                    <button
                      onClick={() => handlePromoteHost(player)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-[#B49A62]/15 text-primary-text rounded-[8px] hover:bg-[#B49A62] hover:text-[#080B10] transition-colors border border-[#B49A62]/35"
                      title={t('promoteToHost')}
                      aria-label={t('promoteToHost')}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleKickPlayer(player.uid)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-[#963F46]/15 text-danger-text rounded-[8px] hover:bg-[#963F46] hover:text-[#F4F6F8] transition-colors border border-[#963F46]/40"
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
                    className="absolute top-1.5 left-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center bg-[#668F9A]/15 text-cyan-text rounded-[8px] hover:bg-[#668F9A] hover:text-[#080B10] transition-colors z-10 border border-[#668F9A]/35"
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
                    size={58}
                    showName={true}
                    status={isCardHost ? 'none' : player.isReady ? 'ready' : 'waiting'}
                    badge={
                      isCardHost ? (
                        <div className="bg-[#B49A62] p-1 rounded-[6px] border border-bg-surface shadow-xs">
                          <Crown className="w-2.5 h-2.5 text-[#080B10]" />
                        </div>
                      ) : player.isReady ? (
                        <div className="bg-[#3E7B67] p-1 rounded-[6px] border border-bg-surface shadow-xs">
                          <Check className="w-2.5 h-2.5 text-[#F4F6F8]" />
                        </div>
                      ) : null
                    }
                  />
                </div>
              </PlayerIntelligenceCard>
            );
          })}

          {Array.from({ length: emptySlotsCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-[12px] p-3 flex flex-col items-center justify-center border border-dashed border-border-strong bg-bg-surface/40 opacity-60 min-h-[124px]"
            >
              <div className="w-12 h-12 rounded-[10px] bg-bg-card mb-2 border border-border" />
              <p className="text-xs font-medium text-text-muted">{t('waitingForPlayer')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto">
        {isHost ? (
          <TacticalButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canStart}
            loading={busyAction}
            onClick={handleStartGame}
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            {playersArr.length < 3
              ? t('needAtLeast3Players')
              : !allReady
              ? t('waitingForPlayersReady')
              : t('startGame')}
          </TacticalButton>
        ) : (
          <TacticalButton
            variant={meReady ? 'secondary' : 'cyan'}
            size="lg"
            fullWidth
            loading={busyAction}
            onClick={handleToggleReady}
            icon={<Check className="w-4 h-4" />}
          >
            {meReady ? t('cancelReady') : t('imReady')}
          </TacticalButton>
        )}
      </div>

      {/* Live Edit Settings Modal (Host Only) */}
      {showEditSettings && isHost && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md my-auto"
          >
            <ModalShell maxWidthClass="max-w-md" className="p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-extrabold mb-4 text-center text-text-main">
                {t('editRoomSettings')}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('numberOfPlayers')}
                  </label>
                  <div className="flex items-center justify-between bg-bg-card border border-border rounded-[10px] p-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditDraft((prev) => ({
                          ...prev,
                          maxPlayers: Math.max(Math.max(3, playersArr.length), prev.maxPlayers - 1),
                        }))
                      }
                      className="min-h-[44px] min-w-[44px] rounded-[8px] bg-bg-surface hover:bg-bg-main flex items-center justify-center border border-border"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-xl font-extrabold font-mono-code tabular-nums text-text-main">
                      {editDraft.maxPlayers}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditDraft((prev) => ({
                          ...prev,
                          maxPlayers: Math.min(10, prev.maxPlayers + 1),
                        }))
                      }
                      className="min-h-[44px] min-w-[44px] rounded-[8px] bg-bg-surface hover:bg-bg-main flex items-center justify-center border border-border"
                    >
                      <Plus size={16} />
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
                        className={`min-h-[44px] rounded-[10px] font-bold text-xs border ${
                          editDraft.language === item.code
                            ? 'bg-[#B49A62]/15 text-primary-text border-[#B49A62]'
                            : 'bg-bg-card text-text-muted border-border'
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
                        className={`min-h-[44px] px-3 rounded-[10px] font-bold text-xs border truncate ${
                          editDraft.category === cat
                            ? 'bg-[#668F9A]/15 text-cyan-text border-[#668F9A]'
                            : 'bg-bg-card text-text-muted border-border'
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
                      className={`flex-1 min-h-[44px] rounded-[10px] font-bold text-xs flex items-center justify-center gap-1.5 border ${
                        editDraft.difficulty === 'easy'
                          ? 'bg-[#668F9A]/15 text-cyan-text border-[#668F9A]'
                          : 'bg-bg-card text-text-muted border-border'
                      }`}
                    >
                      <Eye size={14} />
                      {t('difficultyEasy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDraft({ ...editDraft, difficulty: 'hard' })}
                      className={`flex-1 min-h-[44px] rounded-[10px] font-bold text-xs flex items-center justify-center gap-1.5 border ${
                        editDraft.difficulty === 'hard'
                          ? 'bg-[#963F46]/18 text-danger-text border-[#963F46]'
                          : 'bg-bg-card text-text-muted border-border'
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
                        className={`min-h-[44px] rounded-[10px] font-mono-code font-bold text-xs tabular-nums border ${
                          editDraft.turnDurationSeconds === sec
                            ? 'bg-[#B49A62]/15 text-primary-text border-[#B49A62]'
                            : 'bg-bg-card text-text-muted border-border'
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
                      className={`flex-1 min-h-[44px] rounded-[10px] font-bold text-xs flex items-center justify-center gap-1.5 border ${
                        !editDraft.isPrivate
                          ? 'bg-[#3E7B67]/18 text-emerald-text border-[#3E7B67]'
                          : 'bg-bg-card text-text-muted border-border'
                      }`}
                    >
                      <Globe size={14} />
                      {t('public')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDraft({ ...editDraft, isPrivate: true })}
                      className={`flex-1 min-h-[44px] rounded-[10px] font-bold text-xs flex items-center justify-center gap-1.5 border ${
                        editDraft.isPrivate
                          ? 'bg-[#B49A62]/15 text-primary-text border-[#B49A62]'
                          : 'bg-bg-card text-text-muted border-border'
                      }`}
                    >
                      <Lock size={14} />
                      {t('private')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <TacticalButton
                  variant="secondary"
                  onClick={() => setShowEditSettings(false)}
                  className="flex-1"
                >
                  {t('cancel')}
                </TacticalButton>
                <TacticalButton variant="primary" onClick={saveEditSettings} className="flex-1">
                  {t('save')}
                </TacticalButton>
              </div>
            </ModalShell>
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
