import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, signInWithGoogleRedirect, handleRedirectResult, logOut } from '../firebase';
import { motion } from 'framer-motion';
import { Archive, ArrowRight, Edit2, Award, Flame, CheckCircle, Circle, Image as ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';

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
  COSMETIC_COLLECTIBLES,
  COSMETIC_DOSSIERS,
  COSMETIC_FRAMES,
} from '../src/design/assetRegistry';

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
  const [selectedFrame, setSelectedFrame] = React.useState<'none' | keyof typeof COSMETIC_FRAMES>(() => {
    try {
      const saved = localStorage.getItem('mrwhite_profile_frame');
      return saved === 'obsidian' || saved === 'cyan' || saved === 'amber' ? saved : 'cyan';
    } catch {
      return 'cyan';
    }
  });
  const [selectedDossier, setSelectedDossier] = React.useState<keyof typeof COSMETIC_DOSSIERS>(() => {
    try {
      const saved = localStorage.getItem('mrwhite_profile_dossier');
      return saved === 'classified' ? 'classified' : 'navy';
    } catch {
      return 'navy';
    }
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  const handleSelectFrame = (frame: 'none' | keyof typeof COSMETIC_FRAMES) => {
    setSelectedFrame(frame);
    try {
      localStorage.setItem('mrwhite_profile_frame', frame);
    } catch {}
  };

  const handleSelectDossier = (dossier: keyof typeof COSMETIC_DOSSIERS) => {
    setSelectedDossier(dossier);
    try {
      localStorage.setItem('mrwhite_profile_dossier', dossier);
    } catch {}
  };

  React.useEffect(() => {
    // Handle redirect result on mount
    handleRedirectResult()
      .then((result) => {
        if (result) {
          console.log("Redirect sign in success");
        }
      })
      .catch((error) => {
        console.error("Redirect sign in error:", error);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSignIn = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    
    // Call signInWithGoogle immediately without awaiting first to preserve user interaction context
    signInWithGoogle()
      .catch((error: any) => {
        console.error("Sign in error:", error);
        if (error.code === 'auth/popup-blocked') {
          setAuthError(getUITranslation(lang, 'popupBlocked'));
        } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <h2 className="text-2xl font-bold mb-4">{getUITranslation(lang, 'signInRequired')}</h2>
        <p className="text-text-muted mb-8">{getUITranslation(lang, 'signInToSaveProgress')}</p>
        
        {authError && (
          <div className="mb-6 p-4 bg-danger/20 border border-danger/50 rounded-xl text-danger text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold">{authError}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={`w-full py-4 bg-bg-surface text-text-main rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-colors border border-border ${isSigningIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-bg-card'}`}
          >
            {isSigningIn ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-black"></div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
                  <path fill="#34A853" d="M3.5 7.4l3.2 2.3C7.6 7.9 9.6 6.4 12 6.4c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.5 2.4 12 2.4 8.2 2.4 5 4.5 3.5 7.4z" />
                  <path fill="#FBBC05" d="M12 21.6c2.5 0 4.6-.8 6.2-2.2l-2.9-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.7-5.4-4l-3.2 2.5C5 19.5 8.2 21.6 12 21.6z" />
                  <path fill="#4285F4" d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.4-1.1 2.5-2.1 3.2l2.9 2.4c1.7-1.6 3-3.9 3-7.9z" />
                </svg>
                {getUITranslation(lang, 'signInWithGoogle')}
              </>
            )}
          </button>

          {/* Fallback for mobile/blocked popups */}
          {!isSigningIn && (
            <button
              onClick={handleSignInRedirect}
              className="w-full py-3 bg-white/5 text-text-muted rounded-2xl font-bold border border-white/10 hover:bg-white/10 transition-colors text-sm"
            >
              {isRTL ? 'مشكلة في النافذة؟ جرب طريقة أخرى' : 'Problem with popup? Try another way'}
            </button>
          )}
        </div>
        {onOpenArchive && (
          <button
            onClick={onOpenArchive}
            className="mt-4 px-5 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-black text-sm flex items-center gap-2 transition-colors"
          >
            <Archive size={16} />
            <span>{getUITranslation(lang, 'operationArchive')}</span>
          </button>
        )}
        <button
          onClick={onBack}
          className="mt-4 text-text-muted hover:text-white transition-colors"
        >
          {getUITranslation(lang, 'backToHome')}
        </button>
      </div>
    );
  }

  const levelInfo = getLevelProgress(profile.xp, profile.level);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col bg-gradient-to-b from-blue-900/20 to-bg-dark p-4 max-w-2xl mx-auto w-full"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className={`flex justify-between items-center mb-8 gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <button onClick={onBack} className="p-3 card-modern min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowRight className={`w-6 h-6 ${isRTL ? '' : 'rotate-180'}`} />
        </button>
        {onOpenArchive && (
          <button
            onClick={onOpenArchive}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors"
          >
            <Archive size={16} />
            <span>{getUITranslation(lang, 'operationArchive')}</span>
          </button>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <Avatar 
            avatar={isEditing ? editAvatar : (profile.photoURL || '')} 
            name={isEditing ? editName : profile.displayName} 
            size={112}
            frameUrl={selectedFrame !== 'none' ? COSMETIC_FRAMES[selectedFrame] : undefined}
          />
          {isEditing ? (
            <div className="relative">
              <button 
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="absolute bottom-0 right-0 p-2 bg-primary rounded-full border-2 border-bg-dark text-white hover:bg-primary-dark transition-colors z-10"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              {showAvatarMenu && (
                <div className={`absolute top-full mt-2 ${isRTL ? 'left-[-40px]' : 'right-[-40px]'} w-48 card-modern shadow-xl overflow-hidden z-20`}>
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setEditAvatar('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">{getUITranslation(lang, 'useLetter')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${isRTL ? 'text-right' : 'text-left'} border-t border-white/5`}
                  >
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">{getUITranslation(lang, 'uploadImage')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-0 right-0 p-2 bg-bg-surface rounded-full border-2 border-bg-dark text-white hover:bg-primary transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Hidden file input outside the conditional menu */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/png, image/jpeg, image/jpg, image/gif, image/webp" 
          className="hidden" 
        />
        
        {isEditing ? (
          <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-xs">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-bg-surface border border-white/10 rounded-xl p-3 text-white text-center font-bold"
              placeholder={getUITranslation(lang, 'yourName')}
              maxLength={20}
            />
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(profile.displayName);
                  setEditAvatar(profile.photoURL || '');
                }}
                className="btn-modern btn-modern-outline flex-1 py-2 rounded-xl"
                disabled={isSaving}
              >
                {getUITranslation(lang, 'cancel')}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || !editName.trim()}
                className="btn-modern flex-1 py-2 rounded-xl"
              >
                {isSaving ? getUITranslation(lang, 'saving') : getUITranslation(lang, 'save')}
              </button>
            </div>
          </div>
        ) : (
          <h2 className="text-2xl font-bold mt-4 flex items-center gap-2">
            {profile.displayName}
            <Edit2 
              className="w-4 h-4 text-text-muted cursor-pointer hover:text-white" 
              onClick={() => setIsEditing(true)}
            />
          </h2>
        )}
      </div>

      {/* Level & XP */}
      <div className="bg-bg-surface rounded-full p-1 flex items-center mb-6 shadow-lg border border-border">
        <div className="flex-1 px-4">
          <div className="flex justify-between text-xs font-bold text-text-muted mb-1 tabular-nums">
            <span>XP {profile.xp.toLocaleString()} / {levelInfo.nextLevelTotalXp.toLocaleString()}</span>
            <span>{levelInfo.currentLevelXp} / {levelInfo.levelSpanXp}</span>
          </div>
          <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${levelInfo.progressPercent}%` }}></div>
          </div>
        </div>
        <div className="bg-blue-500 text-white font-bold px-4 py-2 rounded-full shadow-md tabular-nums">
          {levelInfo.level} LV
        </div>
      </div>

      {/* Classified Agent Dossier & Cosmetics Card */}
      <div className="relative rounded-3xl overflow-hidden border border-sky-400/25 shadow-[0_18px_42px_rgba(2,6,23,0.5)] mb-6 bg-[#0B1120]">
        <img
          src={COSMETIC_DOSSIERS[selectedDossier]}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/95 via-[#070B14]/70 to-[#0B1120]/60" />

        <div className="relative z-10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#0B1120]/90 flex items-center justify-center border border-amber-400/35 shrink-0 overflow-hidden shadow-md">
                <img
                  src={levelInfo.level >= 5 ? COSMETIC_COLLECTIBLES.agencySeal : COSMETIC_COLLECTIBLES.cipherKey}
                  alt="Agent Crest"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="font-black text-amber-300 drop-shadow-sm text-base truncate">
                  {levelInfo.level >= 10
                    ? isRTL ? 'عميل سري أسطوري' : 'Master Infiltrator'
                    : levelInfo.level >= 5
                    ? isRTL ? 'محقق مخضرم' : 'Veteran Detective'
                    : isRTL ? 'عميل مبتدئ' : 'Rookie Agent'}
                </h3>
                <p className="text-xs text-slate-300 font-bold tabular-nums">
                  {isRTL
                    ? `المستوى ${levelInfo.level} · ${profile.stats.wins} انتصار مسجل`
                    : `Level ${levelInfo.level} · ${profile.stats.wins} total wins`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 font-black text-xs shrink-0 tabular-nums">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{profile.stats.longestStreak || 0}</span>
            </div>
          </div>

          {/* Frame & Dossier Cosmetic Customizer */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300">
                {isRTL ? 'إطار الصورة:' : 'Frame:'}
              </span>
              {(['obsidian', 'cyan', 'amber'] as const).map((frameKey) => (
                <button
                  key={frameKey}
                  type="button"
                  onClick={() => handleSelectFrame(frameKey)}
                  title={frameKey}
                  className={`w-8 h-8 rounded-full p-0.5 border transition-transform ${
                    selectedFrame === frameKey
                      ? 'border-sky-400 scale-110 bg-sky-500/20'
                      : 'border-white/20 bg-black/40 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={COSMETIC_FRAMES[frameKey]}
                    alt={frameKey}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300">
                {isRTL ? 'خلفية الملف:' : 'Dossier:'}
              </span>
              {(['navy', 'classified'] as const).map((dossierKey) => (
                <button
                  key={dossierKey}
                  type="button"
                  onClick={() => handleSelectDossier(dossierKey)}
                  className={`w-10 h-6 rounded-lg overflow-hidden border transition-all ${
                    selectedDossier === dossierKey
                      ? 'border-sky-400 ring-1 ring-sky-400'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={COSMETIC_DOSSIERS[dossierKey]}
                    alt={dossierKey}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
            <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <h3 className="text-base font-black flex items-center gap-2 text-text-main">
                <Award className="w-5 h-5 text-amber-400" />
                <span>{isRTL ? 'أوسمة وإنجازات الوكالة' : 'Agency Achievements'}</span>
              </h3>
              <span className="text-xs font-bold text-text-muted tabular-nums">
                {unlockedCount} / {ACHIEVEMENT_CATALOG.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ACHIEVEMENT_CATALOG.map((ach) => {
                const unlocked = Boolean(unlockedMap[ach.id]);
                const title = ach.titles[lang as 'ar' | 'en' | 'fr'] || ach.titles.en;
                const desc = ach.descriptions[lang as 'ar' | 'en' | 'fr'] || ach.descriptions.en;

                return (
                  <div
                    key={ach.id}
                    title={desc}
                    className={`rounded-2xl p-2.5 border flex flex-col items-center text-center transition-all ${
                      unlocked
                        ? 'bg-bg-surface border-amber-400/35 shadow-md'
                        : 'bg-bg-surface/60 border-border opacity-55 grayscale'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0B1120] border border-white/10 mb-2 shrink-0">
                      <img
                        src={ach.icon}
                        alt={title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-black text-text-main leading-tight line-clamp-2">
                      {title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Game Statistics (Win/Loss Ratios & Favorite Roles Across Sessions) */}
      <GameStatistics profile={profile} userId={user.uid} lang={lang} />

      {/* Friends Section */}
      <FriendsSection />

      {/* Leaderboard Section */}
      <LeaderboardSection />

      {/* Connected Accounts */}
      <h3 className={`text-lg font-black mb-4 drop-shadow-sm ${isRTL ? 'text-right' : 'text-left'}`}>{getUITranslation(lang, 'connectedAccounts')}</h3>
      <div className="card-modern overflow-hidden mb-8">
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          {profile.connectedAccounts.apple ? (
            <CheckCircle className="w-6 h-6 text-blue-400 drop-shadow-sm" />
          ) : (
            <Circle className="w-6 h-6 text-text-muted" />
          )}
          <span className="font-bold text-text-main">Apple</span>
        </div>
        <div className="flex items-center gap-3 p-4">
          {profile.connectedAccounts.google ? (
            <CheckCircle className="w-6 h-6 text-blue-400 drop-shadow-sm" />
          ) : (
            <Circle className="w-6 h-6 text-text-muted" />
          )}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="font-bold block text-text-main">Google</span>
            {profile.connectedAccounts.google && user?.email && (
              <span className="text-sm text-text-muted font-bold">{user.email}</span>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={logOut}
        className="btn-modern btn-modern-danger w-full py-5 rounded-[2rem] font-black mb-8"
      >
        {getUITranslation(lang, 'logOut')}
      </button>
    </motion.div>
  );
};
