import { COSMETIC_BADGES } from '../src/design/assetRegistry';

export interface ShopItem {
  id: string;
  cost: number;
  icon: string;
  badge: string;
  image?: string;
  color: string;
  isFunctional?: boolean;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  unlockedMsgs: Record<string, string>;
}

export const LEGACY_ITEM_MAP: Record<string, string> = {
  chechia: 'detective_badge',
  mint_tea: 'extra_time',
  mustache: 'spy_glasses',
  harissa: 'golden_dossier',
  gold_cup: 'master_crown',
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'detective_badge',
    cost: 20,
    icon: '🕵️',
    badge: '🕵️',
    image: COSMETIC_BADGES.detective_badge,
    color: 'from-sky-500 to-blue-600',
    names: {
      ar: 'شارة المحقق السري',
      en: 'Detective Badge',
      fr: 'Badge de Détective',
    },
    descriptions: {
      ar: 'شارة استخباراتية رسمية تظهر بجانب اسمك في لوحة المتصدرين لتميّزك كعميل مخضرم.',
      en: 'Official intelligence badge displayed next to your name on the scoreboard.',
      fr: 'Badge officiel affiché à côté de votre nom dans le classement.',
    },
    unlockedMsgs: {
      ar: 'تم تفعيل شارة المحقق السري! أصبحت تظهر الآن بجانب اسمك في لوحة الترتيب.',
      en: 'Detective Badge unlocked! It now shines next to your name on the scoreboard.',
      fr: 'Badge de Détective débloqué ! Il apparaît désormais dans le classement.',
    },
  },
  {
    id: 'extra_time',
    cost: 30,
    icon: '⏱️',
    badge: '⏱️',
    image: COSMETIC_BADGES.extra_time,
    color: 'from-emerald-500 to-teal-600',
    isFunctional: true,
    names: {
      ar: 'ساعة التكتيك (+15 ثانية)',
      en: 'Tactical Watch (+15s)',
      fr: 'Montre Tactique (+15s)',
    },
    descriptions: {
      ar: 'ميزة فعّالة أثناء اللعب: تمنحك +15 ثانية إضافية تلقائياً في مؤقت دورك للوصف أو السؤال!',
      en: 'Active gameplay perk: automatically grants +15 extra seconds on your speaking timer!',
      fr: 'Avantage actif en jeu : ajoute automatiquement +15 secondes à votre tour de parole !',
    },
    unlockedMsgs: {
      ar: 'تم تثبيت ساعة التكتيك! ستحصل الآن على +15 ثانية إضافية تلقائياً عند حلول دورك في الجولات.',
      en: 'Tactical Watch equipped! You will automatically get +15s on your speaking turns.',
      fr: 'Montre Tactique équipée ! Vous aurez +15s supplémentaires à chaque tour.',
    },
  },
  {
    id: 'spy_glasses',
    cost: 45,
    icon: '🕶️',
    badge: '🕶️',
    image: COSMETIC_BADGES.spy_glasses,
    color: 'from-slate-600 to-zinc-800',
    names: {
      ar: 'نظارات التمويه الداكنة',
      en: 'Stealth Shades',
      fr: 'Lunettes Furtives',
    },
    descriptions: {
      ar: 'إكسسوار العملاء الخفيين؛ يضيف أيقونة التمويه الأنيقة بجانب اسمك في الترتيب العام.',
      en: 'Undercover agent eyewear; displays the stealth icon beside your name in rankings.',
      fr: 'Lunettes d’agent infiltré ; affiche l’icône furtive à côté de votre nom.',
    },
    unlockedMsgs: {
      ar: 'تم اقتناء نظارات التمويه! مظهر العميل السري أصبح مكتملاً في سجل الترتيب.',
      en: 'Stealth Shades unlocked! Your secret agent style is now active.',
      fr: 'Lunettes Furtives débloquées ! Votre style d’agent secret est actif.',
    },
  },
  {
    id: 'golden_dossier',
    cost: 65,
    icon: '📁',
    badge: '📁',
    image: COSMETIC_BADGES.golden_dossier,
    color: 'from-amber-500 to-orange-600',
    names: {
      ar: 'الملف السري الموثّق',
      en: 'Classified Dossier',
      fr: 'Dossier Classifié',
    },
    descriptions: {
      ar: 'وسام كبار المحللين؛ يثبت خبرتك في كشف المتخفيين ويعرض شارة الملف السري في الترتيب.',
      en: 'Senior analyst emblem marking your mastery at unmasking infiltrators.',
      fr: 'Emblème d’analyste senior prouvant votre talent pour démasquer les infiltrés.',
    },
    unlockedMsgs: {
      ar: 'تم فتح الملف السري الموثّق! شارة المحلل الخبير مفعّلة الآن على حسابك.',
      en: 'Classified Dossier unlocked! Your analyst badge is now live.',
      fr: 'Dossier Classifié débloqué ! Votre emblème est désormais actif.',
    },
  },
  {
    id: 'master_crown',
    cost: 100,
    icon: '👑',
    badge: '👑',
    image: COSMETIC_BADGES.master_crown,
    color: 'from-yellow-400 to-amber-500',
    names: {
      ar: 'تاج العقل المدبر',
      en: 'Mastermind Crown',
      fr: 'Couronne du Stratège',
    },
    descriptions: {
      ar: 'أرفع وسام في لعبة المتخفي؛ تاج ذهبي يزين اسمك في صدارة لوحة المتصدرين.',
      en: 'The highest honor in Undercover; crowns your name at the top of the scoreboard.',
      fr: 'La plus haute distinction d’Undercover ; couronne votre nom au classement.',
    },
    unlockedMsgs: {
      ar: 'مبروك! تاج العقل المدبر يلمع الآن بجانب اسمك في صدارة اللاعبين.',
      en: 'Congratulations! The Mastermind Crown now shines next to your name.',
      fr: 'Félicitations ! La Couronne du Stratège brille maintenant à côté de votre nom.',
    },
  },
];

export const normalizeShopItemId = (id: string): string => {
  return LEGACY_ITEM_MAP[id] || id;
};

export const getShopItemField = (
  item: ShopItem,
  field: 'names' | 'descriptions' | 'unlockedMsgs',
  lang: string
): string => {
  const map = item[field];
  return map[lang] || map.en || map.ar;
};
