import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, BookOpen, UserCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCustomWordPairs,
  saveCustomWordPair,
  removeCustomWordPair,
  CustomWordPair,
  getSettings,
} from '../services/storageService';
import { WORD_PAIRS } from '../data/offlineData';
import { getUITranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { BLACKSITE_NAV_ARTWORK } from '../src/design/assetRegistry';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  InteractiveCard,
  ModalShell,
  StatusIndicator,
  TacticalButton,
  TacticalInput,
  TacticalToolbar,
} from './ui/BlacksiteUI';

interface LanguageDictionaryProps {
  onBack: () => void;
}

const CATEGORIES = ['all', 'standard', 'animals', 'food', 'places', 'objects'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];
type WordCategory = Exclude<CategoryFilter, 'all'>;

export const LanguageDictionary: React.FC<LanguageDictionaryProps> = ({ onBack }) => {
  const { isAdmin } = useAuth();
  const settings = getSettings();
  const isRTL = ['ar', 'sa'].includes(settings.language);
  const t = (key: string) => getUITranslation(settings.language, key);

  const [customPairs, setCustomPairs] = useState<CustomWordPair[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(settings.language);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newWord1, setNewWord1] = useState('');
  const [newWord2, setNewWord2] = useState('');
  const [newCategory, setNewCategory] = useState<WordCategory>('standard');
  const customWordsRef = React.useRef<HTMLDivElement>(null);

  const categoryLabels: Record<CategoryFilter, string> = {
    all: isRTL ? 'الكل' : 'All',
    standard: t('standardWords'),
    animals: t('animals'),
    food: t('food'),
    places: isRTL ? 'أماكن ومعالم' : t('catPlaces'),
    objects: isRTL ? 'أشياء وأدوات' : t('catObjects'),
  };

  const languages = [
    { code: 'ar', name: t('arabic'), symbol: 'AR' },
    { code: 'en', name: t('english'), symbol: 'EN' },
    { code: 'fr', name: t('french'), symbol: 'FR' },
    { code: 'es', name: t('spanish'), symbol: 'ES' },
    { code: 'de', name: t('german'), symbol: 'DE' },
    { code: 'tr', name: t('turkish'), symbol: 'TR' },
    { code: 'pt', name: t('portuguese'), symbol: 'PT' },
  ];

  useEffect(() => {
    setCustomPairs(getCustomWordPairs());
  }, []);

  const getLangBaseCount = (lang: string, cat: CategoryFilter = 'all') => {
    const langObj = WORD_PAIRS[lang] || {};
    if (cat === 'all') {
      return Object.values(langObj).reduce((sum, list) => sum + list.length, 0);
    }
    return langObj[cat]?.length || 0;
  };

  const getWordCount = (lang: string) => {
    const baseTotal = getLangBaseCount(lang, 'all');
    const customTotal = customPairs.filter((p) => p.language === lang).length;
    return baseTotal + customTotal;
  };

  const baseCount = getLangBaseCount(selectedLanguage, selectedCategory);
  const myPairsForCategory = customPairs.filter(
    (p) =>
      p.language === selectedLanguage &&
      (selectedCategory === 'all' || (p.category || 'standard') === selectedCategory)
  );
  const myCount = myPairsForCategory.length;

  const handleJumpToMyWords = () => {
    if (customWordsRef.current) {
      customWordsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const basePairsForView = (() => {
    const langObj = WORD_PAIRS[selectedLanguage] || {};
    const catsToInclude: WordCategory[] =
      selectedCategory === 'all'
        ? ['standard', 'animals', 'food', 'places', 'objects']
        : [selectedCategory];

    return catsToInclude.flatMap((cat) =>
      (langObj[cat] || []).map((p, i) => ({
        id: `base-${selectedLanguage}-${cat}-${i}`,
        word1: p[0],
        word2: p[1],
        category: cat,
        isBase: true,
      }))
    );
  })();

  const currentPairs = [
    ...basePairsForView,
    ...myPairsForCategory.map((p) => ({
      ...p,
      category: (p.category || 'standard') as WordCategory,
      isBase: false,
    })),
  ];

  const handleAddPair = () => {
    if (!newWord1.trim() || !newWord2.trim()) return;

    const newPair: CustomWordPair = {
      id: Date.now().toString(),
      word1: newWord1.trim(),
      word2: newWord2.trim(),
      language: selectedLanguage,
      category: newCategory,
    };

    saveCustomWordPair(newPair);
    setCustomPairs(getCustomWordPairs());
    setNewWord1('');
    setNewWord2('');
    setIsAdding(false);
  };

  const handleDeleteCustom = (id: string) => {
    removeCustomWordPair(id);
    setCustomPairs(getCustomWordPairs());
  };

  return (
    <div className="flex flex-col min-h-full w-full relative max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-24">
      <BlacksiteScreenBackdrop bgKey="archive" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1 w-full">
      {/* Header */}
      <DossierHeaderBand
        accent="cyan"
        texture="paper"
        className="mb-4"
        badge={<ClassifiedStamp tone="cyan">LEXICON</ClassifiedStamp>}
        title={t('gameWords')}
        subtitle={
          isRTL
            ? 'أرشيف المفردات الميدانية وإضافة أزواج كلمات مخصصة'
            : 'Field cipher lexicon & custom word-pair registry'
        }
        icon={
          <img
            src={BLACKSITE_NAV_ARTWORK.dictionary}
            alt=""
            aria-hidden="true"
            className="w-7 h-7 object-contain"
          />
        }
        action={
          <TacticalToolbar>
            <IconButton onClick={onBack} aria-label={t('back')} variant="ghost" size="sm">
              <BlacksiteIcon name="backNav" size={18} rtlFlip />
            </IconButton>
            <IconButton
              variant="primary"
              size="sm"
              onClick={() => {
                setNewCategory(selectedCategory === 'all' ? 'standard' : selectedCategory);
                setIsAdding(true);
              }}
              aria-label={t('addWord')}
            >
              <Plus className="w-5 h-5" />
            </IconButton>
          </TacticalToolbar>
        }
      />

      {/* Language & Category Filter Surface */}
      <IntelligencePanel className="relative overflow-hidden blacksite-texture-paper p-3 space-y-2.5 mb-3">
        <div aria-hidden="true" className="blacksite-hairline-cyan absolute inset-x-0 top-0 pointer-events-none" />
        {/* Language Selector */}
        <div className="overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 pb-1">
          {languages.map((langItem) => {
            const active = selectedLanguage === langItem.code;
            return (
              <button
                key={langItem.code}
                type="button"
                onClick={() => setSelectedLanguage(langItem.code)}
                className={`min-h-[44px] px-3 py-1.5 rounded-[10px] border flex items-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 ${
                  active
                    ? 'bg-[#B49A62]/15 border-[#B49A62] text-text-main'
                    : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
                }`}
              >
                <span className="font-mono-code text-[11px] font-semibold text-primary-text">
                  {langItem.symbol}
                </span>
                <span className="font-bold text-xs sm:text-sm">{langItem.name}</span>
                <span className="font-mono-code text-[11px] px-1.5 py-0.5 rounded-[6px] bg-bg-card tabular-nums text-text-muted">
                  {getWordCount(langItem.code)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Filter Tabs */}
        <div className="overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 pt-2 border-t border-border/70">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[44px] px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 ${
                selectedCategory === cat
                  ? 'bg-[#668F9A]/15 border-[#668F9A] text-cyan-text'
                  : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </IntelligencePanel>

      {/* Stats Bar */}
      <div className="py-3 grid grid-cols-2 gap-3">
        <IntelligencePanel className="relative overflow-hidden blacksite-texture-paper p-3 flex flex-col items-center justify-center">
          <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1.5">
            <BookOpen size={13} className="text-primary-text" />
            {t('builtInCount')}
          </span>
          <span className="text-xl font-extrabold text-primary-text font-mono-code tabular-nums">
            {baseCount}
          </span>
        </IntelligencePanel>
        {myCount > 0 ? (
          <InteractiveCard
            onClick={handleJumpToMyWords}
            title={t('jumpToMyWords')}
            accent="cyan"
            className="p-3 flex flex-col items-center justify-center border-[#668F9A]/35"
          >
            <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1.5">
              <UserCircle size={13} className="text-cyan-text" />
              <span>{t('myWordsCount')}</span>
              <ChevronDown size={13} className="text-cyan-text" />
            </span>
            <span className="text-xl font-extrabold text-cyan-text font-mono-code tabular-nums">
              {myCount}
            </span>
          </InteractiveCard>
        ) : (
          <IntelligencePanel className="relative overflow-hidden p-3 flex flex-col items-center justify-center">
            <div aria-hidden="true" className="blacksite-hairline-cyan absolute inset-x-0 top-0 pointer-events-none" />
            <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1.5">
              <UserCircle size={13} className="text-cyan-text" />
              {t('myWordsCount')}
            </span>
            <span className="text-xl font-extrabold text-cyan-text font-mono-code tabular-nums">
              {myCount}
            </span>
          </IntelligencePanel>
        )}
      </div>

      {/* Word List */}
      <div className="flex-1 space-y-2.5">
        {currentPairs.map((pair, index) => (
          <React.Fragment key={pair.id}>
            {!pair.isBase && currentPairs[index - 1]?.isBase && (
              <div ref={customWordsRef} className="py-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border-strong" />
                <span className="text-xs font-bold text-primary-text">{t('myWordsCount')}</span>
                <div className="h-px flex-1 bg-border-strong" />
              </div>
            )}
            <div
              className={`rounded-[12px] bg-bg-surface/95 p-3.5 flex items-center justify-between gap-3 border shadow-[inset_0_1px_0_var(--surface-highlight)] ${
                pair.isBase ? 'border-border' : 'border-[#B49A62]/45 bg-[#B49A62]/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 text-center min-w-0">
                  <span className="text-sm font-bold text-text-main block truncate">
                    {pair.isBase && !isAdmin ? '••••' : pair.word1}
                  </span>
                </div>
                <div className="w-px h-7 bg-border" />
                <div className="flex-1 text-center min-w-0">
                  <span className="text-sm font-bold text-text-main block truncate">
                    {pair.isBase && !isAdmin ? '••••' : pair.word2}
                  </span>
                </div>
              </div>

              <StatusIndicator tone="neutral">
                {categoryLabels[pair.category || 'standard']}
              </StatusIndicator>

              {!pair.isBase ? (
                <IconButton
                  onClick={() => handleDeleteCustom(pair.id)}
                  variant="danger"
                  size="sm"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              ) : (
                <Info className="w-4 h-4 text-text-muted/40 shrink-0" />
              )}
            </div>
          </React.Fragment>
        ))}
        {currentPairs.length === 0 && (
          <IntelligencePanel className="py-14 px-6 text-center">
            <p className="text-text-muted font-bold text-sm">{t('preparing')}</p>
          </IntelligencePanel>
        )}
      </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#080B10]/85"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              className="w-full max-w-sm relative z-10"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                className="p-6"
                onClose={() => setIsAdding(false)}
                ariaLabel={t('gameWords')}
              >
                <h3 className="text-lg font-extrabold text-center text-text-main mb-4">
                  {t('gameWords')}
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-2 block">
                      {t('wordCategory')}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                        <InteractiveCard
                          key={cat}
                          selected={newCategory === cat}
                          accent="cyan"
                          onClick={() => setNewCategory(cat)}
                          className={`py-2 px-2 text-xs font-bold ${
                            newCategory === cat ? 'text-cyan-text' : 'text-text-muted'
                          } ${cat === 'standard' ? 'col-span-2' : ''}`}
                        >
                          {categoryLabels[cat]}
                        </InteractiveCard>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block">
                      {t('wordIs')}
                    </label>
                    <TacticalInput
                      type="text"
                      value={newWord1}
                      onChange={(e) => setNewWord1(e.target.value)}
                      className="w-full py-3 px-4 font-bold text-center"
                      placeholder="..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block">
                      {t('wordIs')}
                    </label>
                    <TacticalInput
                      type="text"
                      value={newWord2}
                      onChange={(e) => setNewWord2(e.target.value)}
                      className="w-full py-3 px-4 font-bold text-center"
                      placeholder="..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <TacticalButton
                    variant="secondary"
                    onClick={() => setIsAdding(false)}
                    className="flex-1"
                  >
                    {t('cancel')}
                  </TacticalButton>
                  <TacticalButton
                    variant="primary"
                    onClick={handleAddPair}
                    disabled={!newWord1.trim() || !newWord2.trim()}
                    className="flex-1"
                  >
                    {t('save')}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
