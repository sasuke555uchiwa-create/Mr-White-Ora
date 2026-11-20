import React, { useEffect, useState } from 'react';
import { getScores, getSettings, getInventoryMap } from '../services/storageService';
import { SHOP_ITEMS } from '../data/shopItems';
import { Medal, TrendingDown, ArrowLeft, Play } from 'lucide-react';
import { getUITranslation } from '../translations';

interface ScoreboardScreenProps {
  onBack: () => void;
  onNextRound?: () => void;
}

export const ScoreboardScreen: React.FC<ScoreboardScreenProps> = ({
  onBack,
  onNextRound,
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
    <div className="flex flex-col min-h-full animate-fade-in relative px-4 py-4 max-w-2xl mx-auto w-full pb-28">
      <div className="w-full max-w-lg mx-auto flex flex-col">
        {/* Header Banner */}
        <div className="bg-bg-surface/90 border border-border-strong rounded-3xl p-5 text-center mb-5 shadow-xl flex flex-col items-center">
          <img
            src="/i1.png"
            alt={t('playerRanking')}
            referrerPolicy="no-referrer"
            className="w-14 h-14 object-contain mb-2 drop-shadow-md"
          />
          <h2 className="text-xl sm:text-2xl font-black text-text-main">
            {t('playerRanking')}
          </h2>
          <p className="text-text-muted text-xs sm:text-sm font-bold mt-1">
            {t('whoIsTheBoss')}
          </p>
        </div>

        {/* Standings List */}
        <div className="pb-4">
          {sortedPlayers.length === 0 ? (
            <div className="bg-bg-surface/80 border border-border rounded-3xl flex flex-col items-center justify-center h-64 text-text-muted p-6">
              <TrendingDown size={36} className="mb-3 opacity-50" />
              <p className="text-sm font-bold">{t('noScoreRecorded')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedPlayers.map(([name, score], index) => {
                let rankStyle = 'bg-bg-surface/90 border-border-strong';
                let rankIcon = (
                  <span className="font-mono font-black text-text-muted text-sm tabular-nums">
                    #{index + 1}
                  </span>
                );

                if (index === 0) {
                  rankStyle =
                    'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-400/50 shadow-lg';
                  rankIcon = <Medal size={20} className="text-amber-400" />;
                } else if (index === 1) {
                  rankStyle =
                    'bg-gradient-to-r from-slate-300/20 to-slate-400/10 border-slate-300/40';
                  rankIcon = <Medal size={20} className="text-slate-300" />;
                } else if (index === 2) {
                  rankStyle =
                    'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-400/40';
                  rankIcon = <Medal size={20} className="text-orange-400" />;
                }

                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md transition-all ${rankStyle}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 flex justify-center shrink-0">{rankIcon}</div>
                      <span className="font-black text-sm sm:text-base text-text-main truncate flex items-center gap-1.5">
                        <span className="truncate">{name}</span>
                        {getPlayerBadges(name).map((item) =>
                          item.image ? (
                            <img
                              key={item.id}
                              src={item.image}
                              alt={item.names[lang] || item.names.en}
                              title={item.names[lang] || item.names.en}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-md object-cover border border-white/15 shrink-0"
                            />
                          ) : (
                            <span key={item.id} className="text-sm select-none shrink-0">
                              {item.badge}
                            </span>
                          )
                        )}
                      </span>
                    </div>
                    <div className="bg-bg-dark/80 px-3 py-1.5 rounded-xl border border-border-strong shrink-0">
                      <span className="text-sky-400 font-black text-sm tabular-nums">
                        {score}{' '}
                        <span className="text-xs text-text-muted font-bold">{t('points')}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {onNextRound && (
            <button
              onClick={onNextRound}
              className="w-full py-4 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-black flex items-center justify-center gap-2 text-lg shadow-[0_5px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all"
            >
              <Play size={18} className="fill-current" />
              <span>{t('nextRound')}</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-full bg-bg-surface border border-border-strong hover:bg-bg-card text-text-main font-black flex items-center justify-center gap-2 text-base transition-colors"
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
            <span>{onNextRound ? t('endGame') : t('back')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
