import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  ArrowLeft,
  Clock,
  FolderOpen,
  Globe,
  Info,
  Search,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { ClassifiedCaseFile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteLocalCaseFile,
  getLocalCaseFiles,
  getSettings,
} from '../services/storageService';
import {
  fetchUserOnlineCaseFiles,
  mergeCaseFileArchives,
} from '../utils/caseFileService';
import { getUITranslation } from '../translations';
import { playSound } from '../services/soundService';

interface OperationArchiveScreenProps {
  onBack: () => void;
  onOpenCaseFile: (caseFile: ClassifiedCaseFile) => void;
}

export const OperationArchiveScreen: React.FC<OperationArchiveScreenProps> = ({
  onBack,
  onOpenCaseFile,
}) => {
  const { user } = useAuth();
  const settings = getSettings();
  const lang = settings.language || 'ar';
  const isRTL = lang === 'ar';
  const t = (key: string) => getUITranslation(lang, key);

  const [localFiles, setLocalFiles] = useState<ClassifiedCaseFile[]>(() => getLocalCaseFiles());
  const [onlineFiles, setOnlineFiles] = useState<ClassifiedCaseFile[]>([]);
  const [onlineLoading, setOnlineLoading] = useState<boolean>(Boolean(user?.uid));
  const [onlineNotice, setOnlineNotice] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'local' | 'online'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLocalFiles(getLocalCaseFiles());
    if (!user?.uid) {
      setOnlineFiles([]);
      setOnlineLoading(false);
      setOnlineNotice(false);
      return;
    }

    let cancelled = false;
    setOnlineLoading(true);
    setOnlineNotice(false);

    fetchUserOnlineCaseFiles(user.uid, 30)
      .then((docs) => {
        if (!cancelled) {
          setOnlineFiles(docs);
        }
      })
      .catch((err) => {
        console.warn('Could not load online match archive:', err);
        if (!cancelled) {
          setOnlineNotice(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOnlineLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const combinedFiles = useMemo(() => {
    const merged = mergeCaseFileArchives(localFiles, onlineFiles);
    const q = searchQuery.trim().toLowerCase();

    return merged.filter((item) => {
      if (filter !== 'all' && item.mode !== filter) return false;
      if (!q) return true;
      const inOp = item.operationCode.toLowerCase().includes(q);
      const inWords =
        item.secretWord.toLowerCase().includes(q) ||
        item.undercoverWord.toLowerCase().includes(q);
      const inPlayers = item.players.some((p) => p.name.toLowerCase().includes(q));
      return inOp || inWords || inPlayers;
    });
  }, [localFiles, onlineFiles, filter, searchQuery]);

  const confirmDeleteLocal = () => {
    if (!pendingDeleteId) return;
    deleteLocalCaseFile(pendingDeleteId);
    setLocalFiles(getLocalCaseFiles());
    setPendingDeleteId(null);
    playSound('click');
  };

  const formatDate = (ms: number) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));

  return (
    <div
      className="flex flex-col w-full max-w-3xl mx-auto px-4 pt-3 pb-24 space-y-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playSound('click');
            onBack();
          }}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-bg-surface/90 border border-border-strong hover:bg-bg-card text-text-main font-black text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={17} className="rtl:rotate-180" />
          <span>{t('back')}</span>
        </button>

        <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
          <Archive size={17} />
          <span>{t('operationArchive')}</span>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 shadow-xl space-y-3">
        <div className="text-start">
          <h1 className="text-xl sm:text-2xl font-black text-text-main">
            {t('operationArchive')}
          </h1>
          <p className="text-xs font-bold text-text-muted mt-1">{t('operationArchiveSubtitle')}</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2 start-3.5 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchArchivePlaceholder')}
              className="w-full min-h-[44px] ps-10 pe-4 rounded-2xl bg-bg-dark/80 border border-white/10 text-sm font-bold text-text-main placeholder:text-text-muted/70 outline-none focus:border-sky-400/60"
            />
          </div>

          <div className="flex gap-1.5">
            {(['all', 'local', 'online'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  playSound('click');
                  setFilter(tab);
                }}
                className={`min-h-[44px] px-3.5 rounded-2xl text-xs font-black transition-colors ${
                  filter === tab
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-bg-dark/70 text-text-muted hover:text-text-main border border-white/10'
                }`}
              >
                {tab === 'all'
                  ? t('filterAll')
                  : tab === 'local'
                  ? t('filterLocal')
                  : t('filterOnline')}
              </button>
            ))}
          </div>
        </div>

        {onlineNotice && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center gap-2 text-xs font-bold text-amber-200">
            <Info size={15} className="shrink-0" />
            <span>{t('operationArchiveOnlineNotice')}</span>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {onlineLoading && combinedFiles.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-black text-text-muted">{t('caseFileLoading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!onlineLoading && combinedFiles.length === 0 && (
        <div className="rounded-3xl bg-bg-surface/80 border border-border p-10 text-center space-y-3">
          <FolderOpen size={36} className="mx-auto text-text-muted/60" />
          <p className="text-sm font-bold text-text-muted">{t('operationArchiveEmpty')}</p>
        </div>
      )}

      {/* Case Files List */}
      <div className="space-y-3">
        {combinedFiles.map((item) => {
          const factionLabel =
            item.winningFaction === 'citizens'
              ? t('factionCitizens')
              : item.winningFaction === 'undercover_solo'
              ? t('factionUndercoverSolo')
              : item.winningFaction === 'mrwhite_solo'
              ? t('factionMrWhiteSolo')
              : t('factionBothInfiltrators');

          return (
            <motion.div
              key={item.reportId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-bg-surface/90 border border-border-strong hover:border-sky-400/40 p-4 shadow-lg transition-colors flex items-center justify-between gap-3"
            >
              <button
                onClick={() => {
                  playSound('click');
                  onOpenCaseFile(item);
                }}
                className="flex-1 min-w-0 text-start space-y-1.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono text-[11px] font-black tabular-nums">
                    {item.operationCode}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-bold text-text-muted">
                    {item.mode === 'online' ? <Globe size={11} /> : <Smartphone size={11} />}
                    <span>
                      {item.mode === 'online' ? t('filterOnline') : t('filterLocal')}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-text-muted">
                    {formatDate(item.endedAtMs)}
                  </span>
                </div>

                <p className="text-sm sm:text-base font-black text-text-main truncate">
                  {factionLabel} — <span className="text-sky-300">{item.secretWord}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-text-muted tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {item.playerCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {item.roundCount} {t('roundsLabel')}
                  </span>
                </div>
              </button>

              {item.mode === 'local' && (
                <button
                  onClick={() => setPendingDeleteId(item.reportId)}
                  aria-label="Delete"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-rose-300 flex items-center justify-center shrink-0 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal (No native window.confirm) */}
      <AnimatePresence>
        {pendingDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-bg-surface border border-border-strong p-6 text-center space-y-5 shadow-2xl"
            >
              <p className="text-sm font-black text-text-main">{t('deleteCaseFileConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteLocal}
                  className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-text-main font-black text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
