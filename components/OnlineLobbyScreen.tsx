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
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
  TacticalToolbar,
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
      className="flex flex-col px-4 sm:px-6 pt-4 max-w-4xl mx-auto w-full relative min-h-full"
    >
      {/* Header */}
      <DossierHeaderBand
        accent="gold"
        className="mb-4"
        badge={
          <ClassifiedStamp tone="gold">
            {room.isPrivate ? 'PRIVATE OP' : 'PUBLIC OP'}
          </ClassifiedStamp>
        }
        title={t('waitingRoom')}
        subtitle={`${t('hostLabel')} ${room.hostName}`}
        icon={<Users className="w-5 h-5" />}
        action={
          <TacticalToolbar>
            <IconButton onClick={handleLeave} aria-label={t('leaveRoom')} variant="ghost" size="sm">
              <ArrowRight className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
            </IconButton>
            <TacticalButton
              onClick={() => setShowChat(true)}
              aria-label={t('chat')}
              variant="secondary"
              size="sm"
              icon={<MessageCircle className="w-4 h-4 text-cyan-text" />}
            >
              <span>{t('chat')}</span>
              {room.messages?.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-[5px] bg-[#B49A62] text-[#080B10] font-mono-code text-[10px] font-extrabold tabular-nums">
                  {Math.min(99, room.messages.length)}
                </span>
              )}
            </TacticalButton>
          </TacticalToolbar>
        }
      />

      {/* Room Code & Live Settings Card */}
      <IntelligencePanel className="relative overflow-hidden p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
        <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
        <div className="flex items-center gap-3">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {playersArr.map((player: any) => {
            const isCardHost = player.uid === room.hostId;
            const hasActions = (isHost && !isCardHost) || player.uid !== user?.uid;
            return (
              <PlayerIntelligenceCard
                key={player.uid}
                className={`p-3.5 flex flex-col items-center text-center bg-bg-surface ${
                  isCardHost
                    ? 'border-[#B49A62]/45'
                    : player.isReady
                    ? 'border-[#3E7B67]/45'
                    : 'border-border-strong'
                }`}
              >
                <div className="w-full flex items-center justify-between gap-1 mb-2.5 min-h-[22px]">
                  <span className="font-mono-code text-[10px] font-bold text-text-muted">
                    {player.uid === user?.uid ? (isRTL ? 'أنت' : 'YOU') : 'AGENT'}
                  </span>
                  {isCardHost ? (
                    <StatusIndicator tone="gold" icon={<Crown size={10} />}>
                      {t('host')}
                    </StatusIndicator>
                  ) : player.isReady ? (
                    <StatusIndicator tone="emerald" icon={<Check size={10} />}>
                      {isRTL ? 'جاهز' : 'Ready'}
                    </StatusIndicator>
                  ) : (
                    <StatusIndicator tone="neutral">
                      {isRTL ? 'ينتظر' : 'Standby'}
                    </StatusIndicator>
                  )}
                </div>

                <Avatar
                  avatar={player.avatar}
                  name={player.name}
                  size={56}
                  status={isCardHost ? 'none' : player.isReady ? 'ready' : 'waiting'}
                />

                <span className="mt-2 font-bold text-xs sm:text-sm text-text-main truncate max-w-full">
                  {player.name}
                </span>

                {hasActions && (
                  <div className="mt-2.5 pt-2 border-t border-border w-full flex items-center justify-center gap-1.5">
                    {player.uid !== user?.uid && (
                      <IconButton
                        onClick={() => handleSendFriendRequest(player.uid)}
                        variant="secondary"
                        size="sm"
                        className="text-cyan-text border-[#668F9A]/35 hover:bg-[#668F9A] hover:text-[#080B10]"
                        title={t('sendFriendRequest')}
                        aria-label={t('sendFriendRequest')}
                      >
                        <UserPlus className="w-4 h-4" />
                      </IconButton>
                    )}
                    {isHost && !isCardHost && (
                      <>
                        <IconButton
                          onClick={() => handlePromoteHost(player)}
                          variant="primary"
                          size="sm"
                          title={t('promoteToHost')}
                          aria-label={t('promoteToHost')}
                        >
                          <Crown className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleKickPlayer(player.uid)}
                          variant="danger"
                          size="sm"
                          title={t('kickPlayer')}
                          aria-label={t('kickPlayer')}
                        >
                          <X className="w-4 h-4" />
                        </IconButton>
                      </>
                    )}
                  </div>
                )}
              </PlayerIntelligenceCard>
            );
          })}

          {Array.from({ length: emptySlotsCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-[12px] p-3 flex flex-col items-center justify-center border border-dashed border-border-strong bg-bg-surface/40 opacity-60 min-h-[146px]"
            >
              <div className="w-12 h-12 rounded-[10px] bg-bg-card mb-2 border border-border" />
              <p className="text-xs font-medium text-text-muted">{t('waitingForPlayer')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <BottomActionBar className="mt-auto">
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
      </BottomActionBar>

      {/* Live Edit Settings Modal (Host Only) */}
      {showEditSettings && isHost && (
        <div
          onClick={() => setShowEditSettings(false)}
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
              onClose={() => setShowEditSettings(false)}
              ariaLabel={t('editRoomSettings')}
              className="p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-extrabold mb-4 text-center text-text-main">
                {t('editRoomSettings')}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('numberOfPlayers')}
                  </label>
                  <div className="flex items-center justify-between blacksite-card rounded-[10px] p-1.5">
                    <IconButton
                      onClick={() =>
                        setEditDraft((prev) => ({
                          ...prev,
                          maxPlayers: Math.max(Math.max(3, playersArr.length), prev.maxPlayers - 1),
                        }))
                      }
                      variant="secondary"
                      aria-label="Decrease players"
                    >
                      <Minus size={16} />
                    </IconButton>
                    <span className="text-xl font-extrabold font-mono-code tabular-nums text-text-main">
                      {editDraft.maxPlayers}
                    </span>
                    <IconButton
                      onClick={() =>
                        setEditDraft((prev) => ({
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
                      <InteractiveCard
                        key={item.code}
                        selected={editDraft.language === item.code}
                        accent="gold"
                        onClick={() => setEditDraft({ ...editDraft, language: item.code })}
                        className={`font-bold text-xs ${
                          editDraft.language === item.code ? 'text-primary-text' : 'text-text-muted'
                        }`}
                      >
                        {item.label}
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('wordCategory')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                      <InteractiveCard
                        key={cat}
                        selected={editDraft.category === cat}
                        accent="cyan"
                        onClick={() => setEditDraft({ ...editDraft, category: cat })}
                        className={`px-3 font-bold text-xs truncate ${
                          editDraft.category === cat ? 'text-cyan-text' : 'text-text-muted'
                        } ${cat === 'standard' ? 'col-span-2' : ''}`}
                      >
                        {categoryLabels[cat]}
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('difficulty')}
                  </label>
                  <div className="flex gap-2">
                    <InteractiveCard
                      selected={editDraft.difficulty === 'easy'}
                      accent="cyan"
                      onClick={() => setEditDraft({ ...editDraft, difficulty: 'easy' })}
                      className={`flex-1 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        editDraft.difficulty === 'easy' ? 'text-cyan-text' : 'text-text-muted'
                      }`}
                    >
                      <Eye size={14} />
                      {t('difficultyEasy')}
                    </InteractiveCard>
                    <InteractiveCard
                      selected={editDraft.difficulty === 'hard'}
                      accent="crimson"
                      onClick={() => setEditDraft({ ...editDraft, difficulty: 'hard' })}
                      className={`flex-1 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        editDraft.difficulty === 'hard' ? 'text-danger-text' : 'text-text-muted'
                      }`}
                    >
                      <EyeOff size={14} />
                      {t('difficultyHard')}
                    </InteractiveCard>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('turnDuration')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map((sec) => (
                      <InteractiveCard
                        key={sec}
                        selected={editDraft.turnDurationSeconds === sec}
                        accent="gold"
                        onClick={() => setEditDraft({ ...editDraft, turnDurationSeconds: sec })}
                        className={`font-mono-code font-bold text-xs tabular-nums ${
                          editDraft.turnDurationSeconds === sec
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

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5">
                    {t('roomType')}
                  </label>
                  <div className="flex gap-2">
                    <InteractiveCard
                      selected={!editDraft.isPrivate}
                      accent="emerald"
                      onClick={() => setEditDraft({ ...editDraft, isPrivate: false })}
                      className={`flex-1 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        !editDraft.isPrivate ? 'text-emerald-text' : 'text-text-muted'
                      }`}
                    >
                      <Globe size={14} />
                      {t('public')}
                    </InteractiveCard>
                    <InteractiveCard
                      selected={editDraft.isPrivate}
                      accent="gold"
                      onClick={() => setEditDraft({ ...editDraft, isPrivate: true })}
                      className={`flex-1 font-bold text-xs flex items-center justify-center gap-1.5 ${
                        editDraft.isPrivate ? 'text-primary-text' : 'text-text-muted'
                      }`}
                    >
                      <Lock size={14} />
                      {t('private')}
                    </InteractiveCard>
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
