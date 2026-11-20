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
    { code: 'ar', name: t('arabic'), icon: '🇸🇦' },
    { code: 'en', name: t('english'), icon: '🇺🇸' },
    { code: 'fr', name: t('french'), icon: '🇫🇷' },
    { code: 'es', name: t('spanish'), icon: '🇪🇸' },
    { code: 'de', name: t('german'), icon: '🇩🇪' },
    { code: 'tr', name: t('turkish'), icon: '🇹🇷' },
    { code: 'pt', name: t('portuguese'), icon: '🇵🇹' },
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
    <div className="flex flex-col h-full w-full bg-bg-main relative max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border bg-bg-surface/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">{t('gameWords')}</h2>
            <p className="text-xs text-text-muted font-bold">{t('dataManagementDesc')}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setNewCategory(selectedCategory === 'all' ? 'standard' : selectedCategory);
            setIsAdding(true);
          }}
          className="h-10 w-10 btn-chunky bg-primary text-white flex items-center justify-center p-0"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Language Selector */}
      <div className="p-4 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-border bg-bg-dark/20">
        {languages.map((langItem) => (
          <button
            key={langItem.code}
            onClick={() => setSelectedLanguage(langItem.code)}
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all shrink-0 ${
              selectedLanguage === langItem.code
                ? 'bg-primary border-primary text-white shadow-lg'
                : 'bg-bg-surface border-border text-text-muted opacity-70'
            }`}
          >
            <span>{langItem.icon}</span>
            <span className="font-bold text-sm">{langItem.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                selectedLanguage === langItem.code ? 'bg-white/20' : 'bg-black/20'
              }`}
            >
              {getWordCount(langItem.code)}
            </span>
          </button>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="px-4 py-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-border bg-bg-surface/20">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 border ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="card-modern p-3 flex flex-col items-center justify-center bg-bg-surface/30">
          <span className="text-[10px] font-black text-text-muted uppercase mb-1 flex items-center gap-1">
            <BookOpen size={12} />
            {t('builtInCount')}
          </span>
          <span className="text-xl font-black text-primary tabular-nums">{baseCount}</span>
        </div>
        <div className="card-modern p-3 flex flex-col items-center justify-center bg-bg-surface/30 relative">
          <span className="text-[10px] font-black text-text-muted uppercase mb-1 flex items-center gap-1">
            <UserCircle size={12} />
            {t('myWordsCount')}
          </span>
          <span className="text-xl font-black text-accent tabular-nums">{myCount}</span>

          {myCount > 0 && (
            <button
              onClick={handleJumpToMyWords}
              className="absolute -bottom-2 right-2 bg-accent text-white rounded-full p-1.5 shadow-lg active:scale-95 transition-transform"
              title={t('jumpToMyWords')}
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3">
        {currentPairs.map((pair, index) => (
          <React.Fragment key={pair.id}>
            {!pair.isBase && currentPairs[index - 1]?.isBase && (
              <div ref={customWordsRef} className="py-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-primary/20" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  {t('myWordsCount')}
                </span>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
            )}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`card-modern p-4 flex items-center justify-between gap-3 border-2 ${
                pair.isBase ? 'border-border/30' : 'border-primary/30'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1 text-center">
                  <span className="text-sm font-black text-text-main block">
                    {pair.isBase && !isAdmin ? '••••' : pair.word1}
                  </span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex-1 text-center">
                  <span className="text-sm font-black text-text-main block">
                    {pair.isBase && !isAdmin ? '••••' : pair.word2}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/5 text-text-muted shrink-0">
                {categoryLabels[pair.category || 'standard']}
              </span>

              {!pair.isBase ? (
                <button
                  onClick={() => handleDeleteCustom(pair.id)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              ) : (
                <Info className="w-4 h-4 text-text-muted/30 shrink-0" />
              )}
            </motion.div>
          </React.Fragment>
        ))}
        {currentPairs.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-text-muted font-bold">{t('preparing')}</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-bg-surface border-4 border-border rounded-[2.5rem] p-7 relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-center mb-5 uppercase tracking-tight">
                {t('gameWords')}
              </h3>

              <div className="space-y-4 mb-7">
                <div>
                  <label className="text-xs font-black uppercase text-text-muted mb-2 block">
                    {t('wordCategory')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['standard', 'animals', 'food', 'places', 'objects'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-colors ${
                          newCategory === cat
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-bg-dark border-border text-text-muted'
                        } ${cat === 'standard' ? 'col-span-2' : ''}`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-text-muted mb-2 block">
                    {t('wordIs')}
                  </label>
                  <input
                    type="text"
                    value={newWord1}
                    onChange={(e) => setNewWord1(e.target.value)}
                    className="w-full bg-bg-dark border-2 border-border rounded-2xl py-3.5 px-4 font-bold text-center focus:border-primary transition-colors outline-none"
                    placeholder="..."
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-text-muted mb-2 block">
                    {t('wordIs')}
                  </label>
                  <input
                    type="text"
                    value={newWord2}
                    onChange={(e) => setNewWord2(e.target.value)}
                    className="w-full bg-bg-dark border-2 border-border rounded-2xl py-3.5 px-4 font-bold text-center focus:border-primary transition-colors outline-none"
                    placeholder="..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 btn-chunky-white text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddPair}
                  disabled={!newWord1.trim() || !newWord2.trim()}
                  className="flex-1 py-4 btn-chunky bg-primary text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

