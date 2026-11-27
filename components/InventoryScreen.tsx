import React, { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Check, Clock } from 'lucide-react';
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
import { BLACKSITE_NAV_ARTWORK, COSMETIC_COLLECTIBLES } from '../src/design/assetRegistry';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  PlayerIntelligenceCard,
  SegmentedControl,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

interface InventoryScreenProps {
  onBack: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onBack }) => {
  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
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
    <div className="flex flex-col min-h-full w-full relative max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-24">
      <BlacksiteScreenBackdrop bgKey="profile" texture="carbon" />
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div
              className={`p-3.5 rounded-[12px] shadow-2xl border text-start ${
                alertMsg.type === 'success'
                  ? 'bg-bg-surface border-[#3E7B67] text-emerald-text'
                  : 'bg-bg-surface border-[#963F46] text-danger-text'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-sm leading-snug">{alertMsg.text}</span>
                <button
                  onClick={() => setAlertMsg(null)}
                  className="text-xs font-bold hover:underline opacity-80 shrink-0 min-h-[44px] px-2.5"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col flex-1 w-full">
      {/* Header */}
      <DossierHeaderBand
        accent="gold"
        texture="carbon"
        badge={<ClassifiedStamp tone="gold">AGENT VAULT</ClassifiedStamp>}
        title={
          lang === 'ar'
            ? 'خزينة المقتنيات والمزايا'
            : lang === 'fr'
            ? 'Coffre des Avantages'
            : 'Agent Vault & Perks'
        }
        subtitle={
          lang === 'ar'
            ? 'استبدل نقاطك بشارات ومزايا فعلية داخل جولات المتخفي'
            : 'Spend points to unlock badges and real in-game perks'
        }
        icon={
          <img
            src={BLACKSITE_NAV_ARTWORK.vault}
            alt=""
            aria-hidden="true"
            className="w-7 h-7 object-contain"
          />
        }
        action={
          <IconButton onClick={onBack} variant="secondary" aria-label={t('back')}>
            <BlacksiteIcon name="backNav" size={18} rtlFlip />
          </IconButton>
        }
      />

      {/* Player Selector Panel */}
      <IntelligencePanel className="relative overflow-hidden blacksite-texture-carbon mt-4 p-4">
        <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
        <h4
          className={`text-xs font-bold text-text-muted mb-3 flex items-center gap-1.5 ${
            !isRTL ? 'uppercase tracking-wider' : ''
          }`}
        >
          <Trophy size={14} className="text-primary-text" />
          <span>{lang === 'ar' ? 'اختر حساب اللاعب:' : 'Select Player Account:'}</span>
        </h4>

        {Object.keys(scores).length === 0 ? (
          <div className="py-4 text-center text-sm text-text-muted font-medium">
            {lang === 'ar'
              ? 'لا يوجد لاعبون مسجلون بنقاط حالياً. العب جولة لكسب النقاط أولاً!'
              : 'No player scores recorded yet. Play a round to earn points first!'}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.keys(scores).map((name) => {
              const active = selectedPlayer === name;
              return (
                <button
                  key={name}
                  onClick={() => handleSelectPlayer(name)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-[10px] border flex items-center gap-2.5 transition-colors shrink-0 ${
                    active
                      ? 'bg-[#B49A62] border-[#D4BE8A]/50 text-[#080B10]'
                      : 'blacksite-card-interactive text-text-muted hover:text-text-main'
                  }`}
                >
                  <span className="font-bold text-sm">{name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-[6px] font-mono-code font-bold tabular-nums ${
                      active
                        ? 'bg-[#080B10]/15 text-[#080B10]'
                        : 'bg-bg-surface text-primary-text border border-border'
                    }`}
                  >
                    {scores[name]} {t('points')}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </IntelligencePanel>

      {/* Navigation Tabs */}
      <div className="mt-4">
        <SegmentedControl
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            playSound('pop');
          }}
          className="w-full"
          options={[
            {
              value: 'shop',
              label: lang === 'ar' ? 'المتجر والمزايا' : 'Perks Store',
            },
            {
              value: 'my_items',
              label: `${lang === 'ar' ? 'مقتنياتي' : 'My Vault'} (${currentInventory.length})`,
            },
          ]}
        />
      </div>

      {/* Main Container */}
      <div className="mt-4 flex-1 space-y-4">
        {selectedPlayer === '' ? (
          <IntelligencePanel className="relative overflow-hidden blacksite-texture-carbon p-7 flex flex-col items-center justify-center text-center gap-3 border-[#B49A62]/30">
            <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
            <div className="w-16 h-16 rounded-[14px] bg-[#080B10] border border-[#B49A62]/40 p-2 flex items-center justify-center">
              <img
                src={COSMETIC_COLLECTIBLES.agencySeal}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>
            <ClassifiedStamp tone="gold">VAULT LOCKED</ClassifiedStamp>
            <p className="text-text-muted font-semibold text-sm max-w-xs leading-relaxed">
              {lang === 'ar'
                ? 'سجّل نقاطاً في اللعب أولاً لتتمكن من فتح المقتنيات والمزايا السرية!'
                : 'Earn points in a match first to unlock covert badges and field perks!'}
            </p>
          </IntelligencePanel>
        ) : activeTab === 'shop' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SHOP_ITEMS.map((item) => {
              const isUnlocked = currentInventory.includes(item.id);
              const playerPoints = getPlayerPoints(selectedPlayer);
              const isAffordable = playerPoints >= item.cost;

              return (
                <PlayerIntelligenceCard
                  key={item.id}
                  className="p-4 flex flex-col justify-between hover:border-[#B49A62]/40"
                >
                  <div className="flex gap-3.5">
                    <div className="w-14 h-14 rounded-[10px] bg-[#080B10] border border-border-strong flex items-center justify-center text-2xl shrink-0 overflow-hidden">
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
                        <h3 className="font-bold text-sm sm:text-base text-text-main">
                          {getShopItemField(item, 'names', lang)}
                        </h3>
                        {item.isFunctional && (
                          <StatusIndicator tone="emerald" icon={<Clock size={10} />}>
                            {lang === 'ar' ? 'ميزة فعلية' : 'Active Perk'}
                          </StatusIndicator>
                        )}
                      </div>
                      <p className="text-xs font-medium text-text-muted leading-relaxed mt-1">
                        {getShopItemField(item, 'descriptions', lang)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {isUnlocked ? (
                      <span className="text-emerald-text font-bold text-xs flex items-center gap-1">
                        <Check size={14} />
                        {lang === 'ar' ? 'مملوك ومفعّل' : 'Unlocked & Active'}
                      </span>
                    ) : (
                      <span
                        className={`text-sm font-mono-code font-bold tabular-nums ${
                          isAffordable ? 'text-primary-text' : 'text-text-muted'
                        }`}
                      >
                        {item.cost} {t('points')}
                      </span>
                    )}

                    {!isUnlocked ? (
                      <TacticalButton
                        onClick={() => handlePurchase(item)}
                        disabled={!isAffordable}
                        variant={isAffordable ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {lang === 'ar' ? 'فتح وتفعيل' : 'Unlock'}
                      </TacticalButton>
                    ) : (
                      <StatusIndicator tone="emerald">
                        {lang === 'ar' ? 'نشط' : 'Active'}
                      </StatusIndicator>
                    )}
                  </div>
                </PlayerIntelligenceCard>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentInventory.length === 0 ? (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-center gap-3">
                <ShoppingBag className="w-9 h-9 text-text-muted/50" />
                <p className="text-text-muted font-medium text-sm">
                  {lang === 'ar'
                    ? `لا توجد مقتنيات مفعّلة للاعب ${selectedPlayer} بعد.`
                    : `No items unlocked for ${selectedPlayer} yet.`}
                </p>
                <TacticalButton onClick={() => setActiveTab('shop')} variant="primary" size="sm">
                  {lang === 'ar' ? 'تصفح المتجر' : 'Browse Store'}
                </TacticalButton>
              </div>
            ) : (
              SHOP_ITEMS.filter((it) => currentInventory.includes(it.id)).map((item) => (
                <PlayerIntelligenceCard
                  key={item.id}
                  className="p-4 border-[#3E7B67]/40 bg-[#3E7B67]/10 text-start"
                >
                  <div className="flex gap-3.5">
                    <div className="w-14 h-14 rounded-[10px] bg-[#080B10] border border-[#3E7B67]/40 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
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
                      <h3 className="font-bold text-base text-emerald-text flex items-center gap-2">
                        <span>{getShopItemField(item, 'names', lang)}</span>
                        <Check size={15} className="shrink-0" />
                      </h3>
                      <p className="text-xs font-medium text-text-muted mt-1">
                        {getShopItemField(item, 'descriptions', lang)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#3E7B67]/20 text-emerald-text text-[11px] font-semibold">
                    {lang === 'ar'
                      ? `مفعّل على حساب ${selectedPlayer} في جولات اللعب.`
                      : `Active on ${selectedPlayer}'s profile.`}
                  </div>
                </PlayerIntelligenceCard>
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
