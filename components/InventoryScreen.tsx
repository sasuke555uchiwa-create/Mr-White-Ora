import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, ShoppingBag, Check, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getScores,
  updatePlayerScore,
  getSettings,
  getInventoryMap,
  addPlayerInventoryItem,
} from '../services/storageService';
import { getUITranslation } from '../translations';
import { playSound } from '../services/soundService';
import { SHOP_ITEMS, ShopItem, getShopItemField } from '../data/shopItems';

interface InventoryScreenProps {
  onBack: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onBack }) => {
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [unlockedItems, setUnlockedItems] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'shop' | 'my_items'>('shop');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    const rawScores = getScores();
    setScores(rawScores);

    const playerNames = Object.keys(rawScores);
    if (playerNames.length > 0) {
      setSelectedPlayer(playerNames[0]);
    }

    setUnlockedItems(getInventoryMap());
  }, []);

  const handleSelectPlayer = (name: string) => {
    setSelectedPlayer(name);
    playSound('pop');
  };

  const getPlayerPoints = (name: string) => scores[name] || 0;

  const handlePurchase = (item: ShopItem) => {
    if (!selectedPlayer) {
      setAlertMsg({
        type: 'error',
        text: lang === 'ar' ? 'الرجاء اختيار لاعب أولاً للشراء!' : 'Please select a player first!',
      });
      return;
    }

    const playerPoints = getPlayerPoints(selectedPlayer);
    if (playerPoints < item.cost) {
      setAlertMsg({
        type: 'error',
        text:
          lang === 'ar'
            ? 'نقاطك غير كافية! العب أكثر واكسب نقاطاً لتتمكن من الشراء.'
            : 'Not enough points! Play more rounds to earn points.',
      });
      playSound('pop');
      return;
    }

    const playerInventory = unlockedItems[selectedPlayer] || [];
    if (playerInventory.includes(item.id)) {
      setAlertMsg({
        type: 'error',
        text: lang === 'ar' ? 'تمتلك هذه الميزة بالفعل!' : 'You already own this item!',
      });
      return;
    }

    updatePlayerScore(selectedPlayer, -item.cost);
    setScores((prev) => ({
      ...prev,
      [selectedPlayer]: (prev[selectedPlayer] || 0) - item.cost,
    }));

    const newInventory = addPlayerInventoryItem(selectedPlayer, item.id);
    setUnlockedItems(newInventory);

    setAlertMsg({ type: 'success', text: getShopItemField(item, 'unlockedMsgs', lang) });
    playSound('win');
  };

  const currentInventory = selectedPlayer ? unlockedItems[selectedPlayer] || [] : [];

  return (
    <div className="flex flex-col h-full w-full bg-bg-main relative max-w-2xl mx-auto px-4 pb-24">
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div
              className={`p-4 rounded-2xl shadow-2xl border-2 text-start ${
                alertMsg.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                  : 'bg-rose-950/95 border-rose-500 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-sm leading-snug">{alertMsg.text}</span>
                <button
                  onClick={() => setAlertMsg(null)}
                  className="text-xs font-black hover:underline opacity-80 shrink-0"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="py-4 flex items-center justify-between border-b border-border bg-bg-surface/50 backdrop-blur-md sticky top-0 z-20 -mx-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <ShoppingBag className="text-primary w-5 h-5" />
              <span>
                {lang === 'ar'
                  ? 'خزينة المقتنيات والمزايا'
                  : lang === 'fr'
                  ? 'Coffre des Avantages'
                  : 'Agent Vault & Perks'}
              </span>
            </h2>
            <p className="text-xs text-text-muted font-bold">
              {lang === 'ar'
                ? 'استبدل نقاطك بشارات ومزايا فعلية داخل جولات المتخفي'
                : 'Spend points to unlock badges and real in-game perks'}
            </p>
          </div>
        </div>
      </div>

      {/* Player Selector Panel */}
      <div className="mt-4 p-4 card-modern bg-bg-surface/40 border-2 border-border/20">
        <h4 className="text-xs font-black text-text-muted uppercase mb-3 flex items-center gap-1.5">
          <Trophy size={14} className="text-yellow-500" />
          <span>
            {lang === 'ar' ? 'اختر حساب اللاعب:' : 'Select Player Account:'}
          </span>
        </h4>

        {Object.keys(scores).length === 0 ? (
          <div className="py-4 text-center text-sm text-text-muted font-bold">
            {lang === 'ar'
              ? 'لا يوجد لاعبون مسجلون بنقاط حالياً. العب جولة لكسب النقاط أولاً!'
              : 'No player scores recorded yet. Play a round to earn points first!'}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {Object.keys(scores).map((name) => (
              <button
                key={name}
                onClick={() => handleSelectPlayer(name)}
                className={`px-4 py-2 rounded-2xl border-2 flex items-center gap-2.5 transition-all shrink-0 ${
                  selectedPlayer === name
                    ? 'bg-primary border-primary text-white shadow-lg'
                    : 'bg-bg-dark border-border/40 text-text-muted hover:border-text-muted/40'
                }`}
              >
                <span className="font-bold text-sm">{name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-black tabular-nums ${
                    selectedPlayer === name ? 'bg-white/20' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {scores[name]} {t('points')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="mt-5 flex bg-bg-dark/50 p-1 rounded-2xl border border-border">
        <button
          onClick={() => {
            setActiveTab('shop');
            playSound('pop');
          }}
          className={`flex-1 py-3 font-black text-sm rounded-xl transition-all ${
            activeTab === 'shop'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          {lang === 'ar' ? 'المتجر والمزايا' : 'Perks Store'}
        </button>
        <button
          onClick={() => {
            setActiveTab('my_items');
            playSound('pop');
          }}
          className={`flex-1 py-3 font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my_items'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <span>{lang === 'ar' ? 'مقتنياتي' : 'My Vault'}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-black/30 rounded-full tabular-nums">
            {currentInventory.length}
          </span>
        </button>
      </div>

      {/* Main Container */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-4">
        {selectedPlayer === '' ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-10 h-10 text-primary/60 mb-3" />
            <p className="text-text-muted font-bold">
              {lang === 'ar'
                ? 'سجّل نقاطاً في اللعب أولاً لتتمكن من فتح المقتنيات!'
                : 'Earn points in a match first to unlock perks!'}
            </p>
          </div>
        ) : activeTab === 'shop' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHOP_ITEMS.map((item) => {
              const isUnlocked = currentInventory.includes(item.id);
              const playerPoints = getPlayerPoints(selectedPlayer);
              const isAffordable = playerPoints >= item.cost;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className="card-modern p-4 relative overflow-hidden flex flex-col justify-between border-2 border-border/50 bg-bg-surface/50 hover:border-primary/25 transition-all group"
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-[#0B1120] border border-white/15 flex items-center justify-center text-3xl shadow-lg shrink-0 overflow-hidden group-hover:scale-105 transition-transform`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={getShopItemField(item, 'names', lang)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <div className="text-start flex-1 select-none min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-base text-text-main">
                          {getShopItemField(item, 'names', lang)}
                        </h3>
                        {item.isFunctional && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                            <Clock size={10} />
                            {lang === 'ar' ? 'ميزة فعلية' : 'Active Perk'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-text-muted leading-relaxed mt-1">
                        {getShopItemField(item, 'descriptions', lang)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                    {isUnlocked ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                        <Check size={14} />
                        {lang === 'ar' ? 'مملوك ومفعّل' : 'Unlocked & Active'}
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-black tabular-nums ${
                          isAffordable ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {item.cost} {t('points')}
                      </span>
                    )}

                    {!isUnlocked ? (
                      <button
                        onClick={() => handlePurchase(item)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                          isAffordable
                            ? 'bg-primary border-primary text-white hover:bg-primary-dark hover:scale-105 shadow-md shadow-primary/10'
                            : 'bg-bg-dark border-border/40 text-text-muted opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {lang === 'ar' ? 'فتح وتفعيل' : 'Unlock'}
                      </button>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-semibold text-[10px]">
                        {lang === 'ar' ? 'نشط' : 'Active'}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentInventory.length === 0 ? (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-center">
                <ShoppingBag className="w-10 h-10 text-text-muted/50 mb-3" />
                <p className="text-text-muted font-bold text-sm">
                  {lang === 'ar'
                    ? `لا توجد مقتنيات مفعّلة للاعب ${selectedPlayer} بعد.`
                    : `No items unlocked for ${selectedPlayer} yet.`}
                </p>
                <button
                  onClick={() => setActiveTab('shop')}
                  className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl transition-all"
                >
                  {lang === 'ar' ? 'تصفح المتجر' : 'Browse Store'}
                </button>
              </div>
            ) : (
              SHOP_ITEMS.filter((it) => currentInventory.includes(it.id)).map((item) => (
                <div
                  key={item.id}
                  className="card-modern p-4 relative overflow-hidden border-2 border-emerald-500/30 bg-emerald-500/5 text-start"
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-[#0B1120] border border-emerald-400/30 flex items-center justify-center text-3xl shadow-lg shrink-0 overflow-hidden`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={getShopItemField(item, 'names', lang)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base text-emerald-300 flex items-center gap-2">
                        <span>{getShopItemField(item, 'names', lang)}</span>
                        <Check size={16} className="text-emerald-400 shrink-0" />
                      </h3>
                      <p className="text-xs font-semibold text-emerald-100/75 mt-1">
                        {getShopItemField(item, 'descriptions', lang)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    {lang === 'ar'
                      ? `مفعّل على حساب ${selectedPlayer} في جولات اللعب.`
                      : `Active on ${selectedPlayer}'s profile.`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
