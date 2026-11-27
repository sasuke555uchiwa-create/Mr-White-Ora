import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  handleRedirectResult,
  logOut,
} from '../firebase';
import { motion } from 'framer-motion';
import {
  Archive,
  Award,
  Flame,
  CheckCircle,
  Circle,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { FriendsSection } from './FriendsSection';
import { LeaderboardSection } from './LeaderboardSection';
import { GameStatistics } from './GameStatistics';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { showToast } from '../utils/toast';
import { compressAvatarImage } from '../utils/imageUtils';
import { getLevelProgress } from '../utils/levelUtils';
import {
  ACHIEVEMENT_CATALOG,
  BLACKSITE_TEXTURES,
  COSMETIC_COLLECTIBLES,
  COSMETIC_DOSSIERS,
  COSMETIC_FRAMES,
} from '../src/design/assetRegistry';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  ClassifiedDossierPanel,
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  PlayerIntelligenceCard,
  ScreenSectionHeader,
  TacticalButton,
  TacticalInput,
  TacticalToolbar,
} from './ui/BlacksiteUI';

interface ProfileScreenProps {
  onBack: () => void;
  onOpenArchive?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onOpenArchive }) => {
  const { user, profile, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editAvatar, setEditAvatar] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = React.useState(false);
  const [selectedFrame, setSelectedFrame] = React.useState<'none' | keyof typeof COSMETIC_FRAMES>(
    () => {
      try {
        const saved = localStorage.getItem('mrwhite_profile_frame');
        return saved === 'obsidian' || saved === 'cyan' || saved === 'amber' ? saved : 'cyan';
      } catch {
        return 'cyan';
      }
    }
  );
  const [selectedDossier, setSelectedDossier] = React.useState<keyof typeof COSMETIC_DOSSIERS>(
    () => {
      try {
        const saved = localStorage.getItem('mrwhite_profile_dossier');
        return saved === 'classified' ? 'classified' : 'navy';
      } catch {
        return 'navy';
      }
    }
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  const handleSelectFrame = (frame: 'none' | keyof typeof COSMETIC_FRAMES) => {
    setSelectedFrame(frame);
    try {
      localStorage.setItem('mrwhite_profile_frame', frame);
    } catch (err) {
      console.warn('Could not save frame selection:', err);
    }
  };

  const handleSelectDossier = (dossier: keyof typeof COSMETIC_DOSSIERS) => {
    setSelectedDossier(dossier);
    try {
      localStorage.setItem('mrwhite_profile_dossier', dossier);
    } catch (err) {
      console.warn('Could not save dossier selection:', err);
    }
  };

  React.useEffect(() => {
    handleRedirectResult()
      .then((result) => {
        if (result) {
          console.log('Redirect sign in success');
        }
      })
      .catch((error) => {
        console.error('Redirect sign in error:', error);
        setAuthError(`${getUITranslation(lang, 'signInError')} (${error.code})`);
      });
  }, []);

  React.useEffect(() => {
    if (profile) {
      setEditName(profile.displayName);
      setEditAvatar(profile.photoURL || '');
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 1024 * 1024 * 5) {
      showToast(getUITranslation(lang, 'imageTooLarge'), 'error');
      return;
    }

    try {
      const compressed = await compressAvatarImage(file, 256, 0.85);
      setEditAvatar(compressed);
      setShowAvatarMenu(false);
    } catch {
      showToast(getUITranslation(lang, 'imageTooLarge'), 'error');
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim().slice(0, 50);
    if (!user || !profile || !trimmedName) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const publicRef = doc(db, 'publicProfiles', user.uid);
      batch.update(userRef, {
        displayName: trimmedName,
        photoURL: editAvatar,
        updatedAt: serverTimestamp(),
      });
      batch.set(
        publicRef,
        {
          uid: user.uid,
          displayName: trimmedName,
          photoURL: editAvatar,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <BlacksiteScreenBackdrop bgKey="profile" texture="carbon" />
        <div className="relative z-10 animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#B49A62]" />
      </div>
    );
  }

  const handleSignIn = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);

    signInWithGoogle()
      .catch((error: any) => {
        console.error('Sign in error:', error);
        if (error.code === 'auth/popup-blocked') {
          setAuthError(getUITranslation(lang, 'popupBlocked'));
        } else if (
          error.code === 'auth/cancelled-popup-request' ||
          error.code === 'auth/popup-closed-by-user'
        ) {
          setAuthError(getUITranslation(lang, 'signInCancelled'));
        } else {
          setAuthError(`${getUITranslation(lang, 'signInError')} (${error.code || 'unknown'})`);
        }
      })
      .finally(() => {
        setIsSigningIn(false);
      });
  };

  const handleSignInRedirect = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    signInWithGoogleRedirect();
  };

  if (!user || !profile) {
    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <BlacksiteScreenBackdrop bgKey="profile" texture="carbon" />
        <IntelligencePanel className="relative z-10 overflow-hidden p-6 w-full space-y-5 blacksite-texture-carbon border-[#B49A62]/35">
          <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-[14px] bg-[#080B10] border border-[#B49A62]/40 p-2 mb-3 flex items-center justify-center shadow-lg">
              <img
                src={COSMETIC_COLLECTIBLES.agencySeal}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>
            <ClassifiedStamp tone="gold" className="mb-3">
              OPERATIVE ACCESS
            </ClassifiedStamp>
            <h2 className="text-xl sm:text-2xl font-bold text-text-main mb-2">
              {getUITranslation(lang, 'signInRequired')}
            </h2>
            <p className="text-text-muted text-sm font-medium leading-relaxed">
              {getUITranslation(lang, 'signInToSaveProgress')}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-[#963F46]/15 border border-[#963F46]/45 rounded-[10px] text-danger-text text-xs flex items-center gap-2.5 text-start">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{authError}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 w-full">
            <TacticalButton
              onClick={handleSignIn}
              disabled={isSigningIn}
              loading={isSigningIn}
              variant="secondary"
              size="lg"
              fullWidth
              icon={
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
                  />
                  <path
                    fill="#34A853"
                    d="M3.5 7.4l3.2 2.3C7.6 7.9 9.6 6.4 12 6.4c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4 8.2 2.4 5 4.5 3.5 7.4z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12 21.6c2.5 0 4.6-.8 6.2-2.2l-2.9-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.7-5.4-4l-3.2 2.5C5 19.5 8.2 21.6 12 21.6z"
                  />
                  <path
                    fill="#4285F4"
                    d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.4-1.1 2.5-2.1 3.2l2.9 2.4c1.7-1.6 3-3.9 3-7.9z"
                  />
                </svg>
              }
            >
              {getUITranslation(lang, 'signInWithGoogle')}
            </TacticalButton>

            {!isSigningIn && (
              <TacticalButton
                onClick={handleSignInRedirect}
                variant="ghost"
                size="md"
                fullWidth
              >
                {isRTL ? 'مشكلة في النافذة؟ جرب طريقة أخرى' : 'Problem with popup? Try another way'}
              </TacticalButton>
            )}

            {onOpenArchive && (
              <TacticalButton
                onClick={onOpenArchive}
                variant="cyan"
                size="md"
                fullWidth
                icon={<Archive size={16} />}
              >
                {getUITranslation(lang, 'operationArchive')}
              </TacticalButton>
            )}

            <TacticalButton onClick={onBack} variant="ghost" size="sm" fullWidth>
              {getUITranslation(lang, 'backToHome')}
            </TacticalButton>
          </div>
        </IntelligencePanel>
      </div>
    );
  }

  const levelInfo = getLevelProgress(profile.xp, profile.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative flex flex-col px-4 sm:px-6 pt-4 max-w-3xl mx-auto w-full pb-24"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <BlacksiteScreenBackdrop bgKey="profile" texture="carbon" />
      <div className="relative z-10 flex flex-col w-full flex-1">
      {/* Header */}
      <DossierHeaderBand
        accent="gold"
        texture="carbon"
        className="mb-5"
        badge={<ClassifiedStamp tone="gold">OPERATIVE FILE</ClassifiedStamp>}
        icon={<BlacksiteIcon name="profile" size={20} />}
        title={profile.displayName}
        subtitle={
          isRTL
            ? `المستوى ${levelInfo.level} · ${profile.stats.wins} انتصار`
            : `Level ${levelInfo.level} · ${profile.stats.wins} total wins`
        }
        action={
          <TacticalToolbar>
            <IconButton
              onClick={onBack}
              variant="ghost"
              size="sm"
              aria-label={getUITranslation(lang, 'back')}
            >
              <BlacksiteIcon name="backNav" size={18} rtlFlip />
            </IconButton>
            {onOpenArchive && (
              <TacticalButton
                onClick={onOpenArchive}
                variant="cyan"
                size="sm"
                icon={<Archive size={15} />}
              >
                {getUITranslation(lang, 'operationArchive')}
              </TacticalButton>
            )}
          </TacticalToolbar>
        }
      />

      {/* Avatar & Name */}
      <IntelligencePanel className="relative overflow-hidden blacksite-texture-carbon p-5 flex flex-col items-center mb-5">
        <div aria-hidden="true" className="blacksite-hairline-cyan absolute inset-x-0 top-0 pointer-events-none" />
        <Avatar
          avatar={isEditing ? editAvatar : profile.photoURL || ''}
          name={isEditing ? editName : profile.displayName}
          size={100}
          frameUrl={selectedFrame !== 'none' ? COSMETIC_FRAMES[selectedFrame] : undefined}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
          className="hidden"
        />

        {isEditing ? (
          <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="relative w-full flex justify-center">
              <TacticalButton
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                variant="secondary"
                size="sm"
                icon={<ImageIcon className="w-4 h-4 text-cyan-text" />}
              >
                {getUITranslation(lang, 'uploadImage')}
              </TacticalButton>

              {showAvatarMenu && (
                <div className="absolute top-full mt-2 w-52 blacksite-panel rounded-[12px] overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setEditAvatar('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-card transition-colors min-h-[44px] ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 text-primary-text" />
                    <span className="font-semibold text-sm text-text-main">
                      {getUITranslation(lang, 'useLetter')}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-card transition-colors min-h-[44px] ${
                      isRTL ? 'text-right' : 'text-left'
                    } border-t border-border`}
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-text" />
                    <span className="font-semibold text-sm text-text-main">
                      {getUITranslation(lang, 'uploadImage')}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <TacticalInput
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-center font-bold"
              placeholder={getUITranslation(lang, 'yourName')}
              maxLength={20}
            />
            <div className="flex gap-2 w-full">
              <TacticalButton
                onClick={() => {
                  setIsEditing(false);
                  setShowAvatarMenu(false);
                  setEditName(profile.displayName);
                  setEditAvatar(profile.photoURL || '');
                }}
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={isSaving}
              >
                {getUITranslation(lang, 'cancel')}
              </TacticalButton>
              <TacticalButton
                onClick={handleSaveProfile}
                disabled={isSaving || !editName.trim()}
                loading={isSaving}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                {isSaving ? getUITranslation(lang, 'saving') : getUITranslation(lang, 'save')}
              </TacticalButton>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-text-main">{profile.displayName}</h3>
            <IconButton
              onClick={() => setIsEditing(true)}
              variant="secondary"
              size="sm"
              aria-label="Edit Profile"
            >
              <BlacksiteIcon name="editPlayer" size={16} />
            </IconButton>
          </div>
        )}

        {/* Level & XP */}
        <div className="w-full mt-4 pt-4 border-t border-border flex items-center gap-3">
          <div className="flex-1 px-1">
            <div className="flex justify-between text-xs font-mono-code font-semibold text-text-muted mb-1.5 tabular-nums">
              <span>
                XP {profile.xp.toLocaleString()} / {levelInfo.nextLevelTotalXp.toLocaleString()}
              </span>
              <span>
                {levelInfo.currentLevelXp} / {levelInfo.levelSpanXp}
              </span>
            </div>
            <div className="h-2 bg-bg-card rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-[#668F9A] rounded-full transition-all"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="bg-[#B49A62] text-[#080B10] font-mono-code font-bold px-3.5 py-2 rounded-[8px] text-xs shrink-0 tabular-nums">
            LV {levelInfo.level}
          </div>
        </div>
      </IntelligencePanel>

      {/* Classified Agent Dossier & Cosmetics Card */}
      <ClassifiedDossierPanel className="relative overflow-hidden mb-6 bg-[#080B10]">
        <img
          src={COSMETIC_DOSSIERS[selectedDossier]}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B10]/95 via-[#080B10]/72 to-[#0D1219]/60" />
        <img
          src={BLACKSITE_TEXTURES.dossierOrnament}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-2.5 inset-x-0 mx-auto w-32 h-5 object-contain opacity-45 z-10"
        />

        <div className="relative z-10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-[10px] bg-[#080B10]/90 flex items-center justify-center border border-[#B49A62]/40 shrink-0 overflow-hidden">
                <img
                  src={
                    levelInfo.level >= 5
                      ? COSMETIC_COLLECTIBLES.agencySeal
                      : COSMETIC_COLLECTIBLES.cipherKey
                  }
                  alt="Agent Crest"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="font-bold text-[#D4BE8A] text-base truncate">
                  {levelInfo.level >= 10
                    ? isRTL
                      ? 'عميل سري أسطوري'
                      : 'Master Infiltrator'
                    : levelInfo.level >= 5
                    ? isRTL
                      ? 'محقق مخضرم'
                      : 'Veteran Detective'
                    : isRTL
                    ? 'عميل مبتدئ'
                    : 'Rookie Agent'}
                </h3>
                <p className="text-xs text-[#A8B1BA] font-semibold tabular-nums">
                  {isRTL
                    ? `المستوى ${levelInfo.level} · ${profile.stats.wins} انتصار مسجل`
                    : `Level ${levelInfo.level} · ${profile.stats.wins} total wins`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[#B49A62]/15 border border-[#B49A62]/35 text-[#D4BE8A] font-mono-code font-bold text-xs shrink-0 tabular-nums">
              <Flame className="w-3.5 h-3.5" />
              <span>{profile.stats.longestStreak || 0}</span>
            </div>
          </div>

          {/* Frame & Dossier Cosmetic Customizer */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#A8B1BA]">
                {isRTL ? 'إطار الصورة:' : 'Frame:'}
              </span>
              {(['obsidian', 'cyan', 'amber'] as const).map((frameKey) => (
                <button
                  key={frameKey}
                  type="button"
                  onClick={() => handleSelectFrame(frameKey)}
                  title={frameKey}
                  aria-label={`Frame ${frameKey}`}
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-[9px] p-1.5 border transition-colors ${
                    selectedFrame === frameKey
                      ? 'border-[#668F9A] bg-[#668F9A]/20'
                      : 'border-white/20 bg-black/40 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={COSMETIC_FRAMES[frameKey]}
                    alt={frameKey}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#A8B1BA]">
                {isRTL ? 'خلفية الملف:' : 'Dossier:'}
              </span>
              {(['navy', 'classified'] as const).map((dossierKey) => (
                <button
                  key={dossierKey}
                  type="button"
                  onClick={() => handleSelectDossier(dossierKey)}
                  aria-label={`Dossier ${dossierKey}`}
                  className={`min-w-[52px] min-h-[44px] h-11 rounded-[8px] overflow-hidden border transition-all ${
                    selectedDossier === dossierKey
                      ? 'border-[#668F9A] ring-1 ring-[#668F9A]'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={COSMETIC_DOSSIERS[dossierKey]}
                    alt={dossierKey}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ClassifiedDossierPanel>

      {/* Agency Achievements Showcase */}
      {(() => {
        const played = profile.stats.played || 0;
        const mrWhiteWins = profile.stats.roleStats?.mrwhite?.wins || 0;
        const undercoverWins = profile.stats.roleStats?.undercover?.wins || 0;
        const citizenWins = profile.stats.roleStats?.citizen?.wins || 0;
        const specialPlayed = Object.entries(profile.stats.roleStats || {})
          .filter(([k]) => !['citizen', 'undercover', 'mrwhite'].includes(k))
          .reduce((sum, [, v]) => sum + (v?.played || 0), 0);

        const unlockedMap: Record<string, boolean> = {
          firstWin: profile.stats.wins >= 1,
          sharpEye: profile.stats.wins >= 3,
          masterDetective: profile.stats.wins >= 10,
          perfectDeduction: profile.stats.wins >= 5 && played >= 10,
          survivor: played >= 5,
          agentVeteran: played >= 15,
          masterOfLies: mrWhiteWins >= 1 || undercoverWins >= 1,
          socialStrategist: citizenWins >= 3,
          specialRoleExpert: specialPlayed >= 1 || played >= 3,
          dailyOperation: (profile.stats.longestStreak || 0) >= 2,
        };
        const unlockedCount = ACHIEVEMENT_CATALOG.filter((a) => unlockedMap[a.id]).length;

        return (
          <div className="mb-8">
            <ScreenSectionHeader
              title={isRTL ? 'أوسمة وإنجازات الوكالة' : 'Agency Achievements'}
              icon={<Award className="w-4 h-4" />}
              action={
                <span className="text-xs font-mono-code font-bold text-text-muted tabular-nums">
                  {unlockedCount} / {ACHIEVEMENT_CATALOG.length}
                </span>
              }
              className="mb-3"
            />

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const unlocked = Boolean(unlockedMap[ach.id]);
                const title = ach.titles[lang as 'ar' | 'en' | 'fr'] || ach.titles.en;
                const desc = ach.descriptions[lang as 'ar' | 'en' | 'fr'] || ach.descriptions.en;

                return (
                  <PlayerIntelligenceCard
                    key={ach.id}
                    title={desc}
                    className={`p-2.5 flex flex-col items-center text-center ${
                      unlocked
                        ? 'border-[#B49A62]/45 bg-[#B49A62]/10'
                        : 'opacity-55 grayscale'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-[8px] overflow-hidden bg-[#080B10] border border-border mb-2 shrink-0">
                      <img
                        src={ach.icon}
                        alt={title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-bold text-text-main leading-tight line-clamp-2">
                      {title}
                    </p>
                  </PlayerIntelligenceCard>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Game Statistics */}
      <GameStatistics profile={profile} userId={user.uid} lang={lang} />

      {/* Friends Section */}
      <FriendsSection />

      {/* Leaderboard Section */}
      <LeaderboardSection />

      {/* Connected Accounts */}
      <h3 className={`text-base font-bold text-text-main mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
        {getUITranslation(lang, 'connectedAccounts')}
      </h3>
      <IntelligencePanel className="overflow-hidden mb-6 divide-y divide-border">
        <div className="flex items-center gap-3 p-4">
          {profile.connectedAccounts.apple ? (
            <CheckCircle className="w-5 h-5 text-cyan-text" />
          ) : (
            <Circle className="w-5 h-5 text-text-muted" />
          )}
          <span className="font-semibold text-sm text-text-main">Apple</span>
        </div>
        <div className="flex items-center gap-3 p-4">
          {profile.connectedAccounts.google ? (
            <CheckCircle className="w-5 h-5 text-cyan-text" />
          ) : (
            <Circle className="w-5 h-5 text-text-muted" />
          )}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="font-semibold text-sm block text-text-main">Google</span>
            {profile.connectedAccounts.google && user?.email && (
              <span className="text-xs text-text-muted font-medium">{user.email}</span>
            )}
          </div>
        </div>
      </IntelligencePanel>

      <TacticalButton onClick={logOut} variant="danger" size="lg" fullWidth>
        {getUITranslation(lang, 'logOut')}
      </TacticalButton>
      </div>
    </motion.div>
  );
};
