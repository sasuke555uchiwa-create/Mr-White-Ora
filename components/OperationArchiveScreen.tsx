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
import {
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  ModalShell,
  PlayerIntelligenceCard,
  SegmentedControl,
  StatusIndicator,
  TacticalButton,
  TacticalInput,
} from './ui/BlacksiteUI';

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
  const isRTL = ['ar', 'sa'].includes(lang);
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
      className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-24 space-y-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <DossierHeaderBand
        accent="gold"
        badge={<ClassifiedStamp tone="gold">ARCHIVE</ClassifiedStamp>}
        title={t('operationArchive')}
        subtitle={t('operationArchiveSubtitle')}
        icon={<Archive size={20} />}
        action={
          <TacticalButton
            onClick={() => {
              playSound('click');
              onBack();
            }}
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} className="rtl:rotate-180" />}
          >
            {t('back')}
          </TacticalButton>
        }
      />

      {/* Search + Filters */}
      <IntelligencePanel className="relative overflow-hidden p-4 space-y-3">
        <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute top-1/2 -translate-y-1/2 start-3.5 text-text-muted pointer-events-none"
            />
            <TacticalInput
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchArchivePlaceholder')}
              className="w-full ps-10 pe-4 placeholder:text-text-muted/70"
            />
          </div>

          <SegmentedControl
            value={filter}
            onChange={(tab) => {
              playSound('click');
              setFilter(tab);
            }}
            size="sm"
            options={[
              { value: 'all', label: t('filterAll') },
              { value: 'local', label: t('filterLocal') },
              { value: 'online', label: t('filterOnline') },
            ]}
          />
        </div>

        {onlineNotice && (
          <div className="p-3 rounded-[10px] bg-[#B49A62]/10 border border-[#B49A62]/30 flex items-center gap-2 text-xs font-medium text-primary-text">
            <Info size={15} className="shrink-0" />
            <span>{t('operationArchiveOnlineNotice')}</span>
          </div>
        )}
      </IntelligencePanel>

      {/* Loading Indicator */}
      {onlineLoading && combinedFiles.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-9 h-9 border-2 border-[#668F9A] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-text-muted">{t('caseFileLoading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!onlineLoading && combinedFiles.length === 0 && (
        <IntelligencePanel className="p-10 text-center space-y-3">
          <FolderOpen size={34} className="mx-auto text-text-muted/60" />
          <p className="text-sm font-medium text-text-muted">{t('operationArchiveEmpty')}</p>
        </IntelligencePanel>
      )}

      {/* Case Files List */}
      <div className="space-y-2.5">
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
            >
              <PlayerIntelligenceCard className="hover:border-[#668F9A]/50 p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playSound('dossierOpen');
                    onOpenCaseFile(item);
                  }}
                  className="flex-1 min-w-0 min-h-[44px] text-start space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 rounded-[8px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ClassifiedStamp tone="gold">{item.operationCode}</ClassifiedStamp>
                    <StatusIndicator
                      tone="neutral"
                      icon={item.mode === 'online' ? <Globe size={11} /> : <Smartphone size={11} />}
                    >
                      {item.mode === 'online' ? t('filterOnline') : t('filterLocal')}
                    </StatusIndicator>
                    <span className="text-[11px] font-medium text-text-muted">
                      {formatDate(item.endedAtMs)}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-text-main truncate">
                    {factionLabel} — <span className="text-cyan-text">{item.secretWord}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-code font-semibold text-text-muted tabular-nums">
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
                  <IconButton
                    onClick={() => setPendingDeleteId(item.reportId)}
                    variant="danger"
                    size="md"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </PlayerIntelligenceCard>
            </motion.div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {pendingDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingDeleteId(null)}
            className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <ModalShell
                onClose={() => setPendingDeleteId(null)}
                ariaLabel={t('deleteCaseFileConfirm')}
                className="p-6 text-center space-y-5"
              >
                <p className="text-sm font-bold text-text-main">{t('deleteCaseFileConfirm')}</p>
                <div className="flex gap-3">
                  <TacticalButton
                    onClick={confirmDeleteLocal}
                    variant="danger"
                    size="md"
                    className="flex-1"
                  >
                    {t('confirm')}
                  </TacticalButton>
                  <TacticalButton
                    onClick={() => setPendingDeleteId(null)}
                    variant="secondary"
                    size="md"
                    className="flex-1"
                  >
                    {t('cancel')}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
