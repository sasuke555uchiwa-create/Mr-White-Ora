import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Info, BookOpen, UserCircle, ChevronDown } from 'lucide-react';
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
import {
  IconButton,
  IntelligencePanel,
  ModalShell,
  StatusIndicator,
  TacticalButton,
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
    <div className="flex flex-col h-full w-full relative max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border bg-bg-surface/80 backdrop-blur-xs sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <IconButton onClick={onBack} aria-label={t('back')} variant="secondary">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </IconButton>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-text-main truncate">{t('gameWords')}</h2>
            <p className="text-xs text-text-muted truncate">{t('dataManagementDesc')}</p>
          </div>
        </div>
        <IconButton
          variant="primary"
          onClick={() => {
            setNewCategory(selectedCategory === 'all' ? 'standard' : selectedCategory);
            setIsAdding(true);
          }}
          aria-label={t('addWord')}
        >
          <Plus className="w-5 h-5" />
        </IconButton>
      </div>

      {/* Language Selector */}
      <div className="p-3.5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-border bg-bg-main/60">
        {languages.map((langItem) => {
          const active = selectedLanguage === langItem.code;
          return (
            <button
              key={langItem.code}
              onClick={() => setSelectedLanguage(langItem.code)}
              className={`min-h-[40px] px-3 py-1.5 rounded-[10px] border flex items-center gap-2 transition-colors shrink-0 ${
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
      <div className="px-3.5 py-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-border bg-bg-surface/40">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`min-h-[36px] px-3 py-1 rounded-[8px] text-xs font-bold transition-colors shrink-0 border ${
              selectedCategory === cat
                ? 'bg-[#668F9A]/15 border-[#668F9A] text-cyan-text'
                : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <IntelligencePanel className="p-3 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1.5">
            <BookOpen size={13} className="text-primary-text" />
            {t('builtInCount')}
          </span>
          <span className="text-xl font-extrabold text-primary-text font-mono-code tabular-nums">
            {baseCount}
          </span>
        </IntelligencePanel>
        <IntelligencePanel className="p-3 flex flex-col items-center justify-center relative">
          <span className="text-[11px] font-bold text-text-muted mb-1 flex items-center gap-1.5">
            <UserCircle size={13} className="text-cyan-text" />
            {t('myWordsCount')}
          </span>
          <span className="text-xl font-extrabold text-cyan-text font-mono-code tabular-nums">
            {myCount}
          </span>

          {myCount > 0 && (
            <button
              onClick={handleJumpToMyWords}
              className="absolute -bottom-2 right-2 bg-[#668F9A] text-[#080B10] rounded-[8px] p-1.5 shadow-md active:scale-95 transition-transform"
              title={t('jumpToMyWords')}
            >
              <ChevronDown size={14} />
            </button>
          )}
        </IntelligencePanel>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-2.5 custom-scrollbar">
        {currentPairs.map((pair, index) => (
          <React.Fragment key={pair.id}>
            {!pair.isBase && currentPairs[index - 1]?.isBase && (
              <div ref={customWordsRef} className="py-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border-strong" />
                <span className="text-xs font-bold text-primary-text">{t('myWordsCount')}</span>
                <div className="h-px flex-1 bg-border-strong" />
              </div>
            )}
            <motion.div
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[12px] bg-bg-surface p-3.5 flex items-center justify-between gap-3 border ${
                pair.isBase ? 'border-border' : 'border-[#B49A62]/40'
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
                <button
                  onClick={() => handleDeleteCustom(pair.id)}
                  className="p-2 text-danger-text hover:bg-[#963F46]/15 rounded-[8px] transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <Info className="w-4 h-4 text-text-muted/40 shrink-0" />
              )}
            </motion.div>
          </React.Fragment>
        ))}
        {currentPairs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-text-muted font-bold text-sm">{t('preparing')}</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
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
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`min-h-[40px] py-2 px-2 rounded-[8px] text-xs font-bold border transition-colors ${
                            newCategory === cat
                              ? 'bg-[#668F9A]/15 border-[#668F9A] text-cyan-text'
                              : 'bg-bg-card border-border text-text-muted'
                          } ${cat === 'standard' ? 'col-span-2' : ''}`}
                        >
                          {categoryLabels[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block">
                      {t('wordIs')}
                    </label>
                    <input
                      type="text"
                      value={newWord1}
                      onChange={(e) => setNewWord1(e.target.value)}
                      className="w-full bg-bg-card border border-border-strong rounded-[10px] py-3 px-4 font-bold text-center text-text-main focus:border-[#668F9A] transition-colors outline-none"
                      placeholder="..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block">
                      {t('wordIs')}
                    </label>
                    <input
                      type="text"
                      value={newWord2}
                      onChange={(e) => setNewWord2(e.target.value)}
                      className="w-full bg-bg-card border border-border-strong rounded-[10px] py-3 px-4 font-bold text-center text-text-main focus:border-[#668F9A] transition-colors outline-none"
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
