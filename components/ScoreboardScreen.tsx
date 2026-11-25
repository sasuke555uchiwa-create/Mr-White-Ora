import React, { useEffect, useState } from 'react';
import { getScores, getSettings, getInventoryMap } from '../services/storageService';
import { SHOP_ITEMS } from '../data/shopItems';
import { Medal, TrendingDown, ArrowLeft, Play, Archive } from 'lucide-react';
import { getUITranslation } from '../translations';
import {
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IntelligencePanel,
  PlayerIntelligenceCard,
  TacticalButton,
} from './ui/BlacksiteUI';

interface ScoreboardScreenProps {
  onBack: () => void;
  onNextRound?: () => void;
  onOpenArchive?: () => void;
}

export const ScoreboardScreen: React.FC<ScoreboardScreenProps> = ({
  onBack,
  onNextRound,
  onOpenArchive,
}) => {
  const [scores, setScores] = useState<Record<string, number>>({});
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  const [unlockedItems, setUnlockedItems] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setScores(getScores());
    setUnlockedItems(getInventoryMap());
  }, []);

  const getPlayerBadges = (name: string) => {
    const items = unlockedItems[name] || [];
    return SHOP_ITEMS.filter((item) => items.includes(item.id));
  };

  const sortedPlayers = Object.entries(scores).sort((a, b) => {
    const scoreA = a[1] as number;
    const scoreB = b[1] as number;
    return scoreB - scoreA;
  });

  return (
    <div className="flex flex-col min-h-full animate-fade-in relative px-4 sm:px-6 pt-4 max-w-3xl mx-auto w-full">
      <div className="w-full max-w-xl mx-auto flex flex-col flex-1">
        {/* Header Banner */}
        <DossierHeaderBand
          accent="gold"
          className="mb-5"
          badge={<ClassifiedStamp tone="gold">RANKINGS</ClassifiedStamp>}
          title={t('playerRanking')}
          subtitle={t('whoIsTheBoss')}
          icon={
            <img
              src="/i1.png"
              alt={t('playerRanking')}
              referrerPolicy="no-referrer"
              className="w-7 h-7 object-contain"
            />
          }
        />

        {/* Standings List */}
        <div className="pb-6 flex-1">
          {sortedPlayers.length === 0 ? (
            <IntelligencePanel className="flex flex-col items-center justify-center h-64 text-text-muted p-6">
              <TrendingDown size={34} className="mb-3 opacity-50" />
              <p className="text-sm font-semibold">{t('noScoreRecorded')}</p>
            </IntelligencePanel>
          ) : (
            <div className="space-y-2.5">
              {sortedPlayers.map(([name, score], index) => {
                let rankStyle = '';
                let rankIcon = (
                  <span className="font-mono-code font-bold text-text-muted text-sm tabular-nums">
                    #{index + 1}
                  </span>
                );

                if (index === 0) {
                  rankStyle = 'bg-[#B49A62]/12 border-[#B49A62]/50';
                  rankIcon = <Medal size={19} className="text-primary-text" />;
                } else if (index === 1) {
                  rankStyle = 'bg-[#A8B1BA]/10 border-[#A8B1BA]/35';
                  rankIcon = <Medal size={19} className="text-text-muted" />;
                } else if (index === 2) {
                  rankStyle = 'bg-[#A46F44]/10 border-[#A46F44]/40';
                  rankIcon = <Medal size={19} className="text-[#C88D5E]" />;
                }

                return (
                  <PlayerIntelligenceCard
                    key={name}
                    className={`flex items-center justify-between p-3.5 ${rankStyle}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 flex justify-center shrink-0">{rankIcon}</div>
                      <span className="font-bold text-sm sm:text-base text-text-main truncate flex items-center gap-1.5">
                        <span className="truncate">{name}</span>
                        {getPlayerBadges(name).map((item) =>
                          item.image ? (
                            <img
                              key={item.id}
                              src={item.image}
                              alt={item.names[lang] || item.names.en}
                              title={item.names[lang] || item.names.en}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-[4px] object-cover border border-border shrink-0"
                            />
                          ) : (
                            <span key={item.id} className="text-sm select-none shrink-0">
                              {item.badge}
                            </span>
                          )
                        )}
                      </span>
                    </div>
                    <div className="bg-bg-surface px-3 py-1 rounded-[8px] border border-border-strong shrink-0">
                      <span className="text-cyan-text font-mono-code font-bold text-sm tabular-nums">
                        {score}{' '}
                        <span className="text-xs text-text-muted font-semibold">{t('points')}</span>
                      </span>
                    </div>
                  </PlayerIntelligenceCard>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomActionBar className="mt-auto">
        <div className="max-w-xl mx-auto flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {onOpenArchive && (
              <TacticalButton
                onClick={onOpenArchive}
                variant="cyan"
                size="md"
                className="flex-1"
                icon={<Archive size={16} />}
              >
                {t('operationArchive')}
              </TacticalButton>
            )}
            {onNextRound && (
              <TacticalButton
                onClick={onNextRound}
                variant="primary"
                size="md"
                className="flex-1"
                icon={<Play size={16} className="fill-current" />}
              >
                {t('nextRound')}
              </TacticalButton>
            )}
          </div>
          <TacticalButton
            onClick={onBack}
            variant="secondary"
            size="lg"
            fullWidth
            icon={<ArrowLeft size={16} className="rtl:rotate-180" />}
          >
            {onNextRound ? t('endGame') : t('back')}
          </TacticalButton>
        </div>
      </BottomActionBar>
    </div>
  );
};
