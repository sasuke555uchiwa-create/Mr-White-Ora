import { PlayerRole, SpecialRoleId } from '../types';
import { ROLE_PORTRAITS } from '../src/design/assetRegistry';

export interface SpecialRoleDefinition {
  id: SpecialRoleId;
  image: string;
  accentColor: string;
  badgeBg: string;
  minPlayers: number;
  isPair?: boolean;
  isNew?: boolean;
  names: Record<string, string>;
  descriptions: Record<string, string>;
}

export const CHARACTER_AVATARS: { id: string; src: string; label: Record<string, string> }[] = [
  { id: 'civilian', src: ROLE_PORTRAITS.citizen, label: { ar: 'عميل مدني', en: 'Civilian Agent' } },
  { id: 'undercover', src: ROLE_PORTRAITS.undercover, label: { ar: 'متخفٍّ', en: 'Undercover' } },
  { id: 'mrwhite', src: ROLE_PORTRAITS.mrwhite, label: { ar: 'Mr. White', en: 'Mr. White' } },
  { id: 'inspector', src: ROLE_PORTRAITS.inspector, label: { ar: 'المحقق', en: 'Inspector' } },
  { id: 'fool', src: ROLE_PORTRAITS.fool, label: { ar: 'Mr. Joy', en: 'Mr. Joy' } },
  { id: 'boomerang', src: ROLE_PORTRAITS.boomerang, label: { ar: 'Mr. Boomerang', en: 'Mr. Boomerang' } },
  { id: 'protector', src: ROLE_PORTRAITS.protector, label: { ar: 'Mr. Shield', en: 'Mr. Shield' } },
  { id: 'justice', src: ROLE_PORTRAITS.justice, label: { ar: 'Mr. Justice', en: 'Mr. Justice' } },
  { id: 'ghost', src: ROLE_PORTRAITS.ghost, label: { ar: 'Mr. Ghost', en: 'Mr. Ghost' } },
  { id: 'lovers', src: ROLE_PORTRAITS.lovers, label: { ar: 'العشاق', en: 'The Lovers' } },
  { id: 'avenger', src: ROLE_PORTRAITS.avenger, label: { ar: 'Mr. Avenger', en: 'Mr. Avenger' } },
  { id: 'mr_meme', src: ROLE_PORTRAITS.mr_meme, label: { ar: 'Mr. Meme', en: 'Mr. Meme' } },
  { id: 'wizard', src: '/assets/roles/wizard.png', label: { ar: 'الساحر', en: 'Wizard' } },
];

export const SPECIAL_ROLES: SpecialRoleDefinition[] = [
  {
    id: 'fool',
    image: ROLE_PORTRAITS.fool,
    accentColor: '#7c3aed',
    badgeBg: 'bg-violet-500/20 border-violet-400/50 text-violet-300',
    minPlayers: 4,
    isNew: true,
    names: {
      ar: 'Mr. Joy',
      en: 'Mr. Joy',
      fr: 'Mr. Joy'
    },
    descriptions: {
      ar: 'لا يفوز بمفرده؛ يكسب +4 نقاط إضافية إذا تم إقصاؤه في التصويت الأول وتستمر اللعبة بعدها!',
      en: 'Does not win solo — earns +4 bonus points if voted out first, and the match continues!',
      fr: 'Ne gagne pas seul — gagne +4 points bonus s’il est éliminé en premier, puis la partie continue !'
    }
  },
  {
    id: 'boomerang',
    image: ROLE_PORTRAITS.boomerang,
    accentColor: '#ef4444',
    badgeBg: 'bg-rose-500/20 border-rose-400/50 text-rose-300',
    minPlayers: 4,
    names: {
      ar: 'Mr. Boomerang',
      en: 'Mr. Boomerang',
      fr: 'Mr. Boomerang'
    },
    descriptions: {
      ar: 'هجوم عكسي لمرة واحدة: إذا نال أغلبية الأصوات لأول مرة ينجو ويرتد الإقصاء فوراً على أحد المصوتين ضده بدلاً منه!',
      en: 'One-time counterattack: the first time he gets the most votes, he survives and bounces the elimination onto one of his voters!',
      fr: 'Contre-attaque unique : la première fois qu’il reçoit le plus de votes, il survit et renvoie l’élimination sur un votant !'
    }
  },
  {
    id: 'protector',
    image: ROLE_PORTRAITS.protector,
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-500/20 border-blue-400/50 text-blue-300',
    minPlayers: 4,
    names: {
      ar: 'Mr. Shield',
      en: 'Mr. Shield',
      fr: 'Mr. Shield'
    },
    descriptions: {
      ar: 'درع دفاعي لمرة واحدة: في التصويت الجماعي يحمي صاحبه تلقائياً، وفي التصويت الفردي السري يختار من يحميه (نفسه أو لاعباً آخر)؛ فإذا صُوّت ضد المحمي لا يخرج أحد!',
      en: 'One-time defense shield: auto-protects himself in Group Vote, or lets him secretly choose anyone to guard in Individual Vote — preventing any elimination!',
      fr: 'Bouclier unique : protège automatiquement son porteur en vote collectif, ou permet de protéger un joueur au choix en vote individuel !'
    }
  },
  {
    id: 'justice',
    image: ROLE_PORTRAITS.justice,
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
    minPlayers: 4,
    names: {
      ar: 'Mr. Justice',
      en: 'Mr. Justice',
      fr: 'Mr. Justice'
    },
    descriptions: {
      ar: 'عند تعادل الأصوات، يحسم Mr. Justice القرار ويختار من سيتم إقصاؤه (حتى لو أُقصي سابقاً).',
      en: 'Breaks any voting tie by deciding who gets eliminated (even if already eliminated).',
      fr: 'Départage toute égalité de votes en choisissant le joueur éliminé (même s’il a été éliminé).'
    }
  },
  {
    id: 'ghost',
    image: ROLE_PORTRAITS.ghost,
    accentColor: '#0ea5e9',
    badgeBg: 'bg-sky-500/20 border-sky-400/50 text-sky-300',
    minPlayers: 4,
    names: {
      ar: 'Mr. Ghost',
      en: 'Mr. Ghost',
      fr: 'Mr. Ghost'
    },
    descriptions: {
      ar: 'يواصل Mr. Ghost المشاركة في النقاش والتصويت على الإقصاء حتى بعد خروجه من الجولة!',
      en: 'Continues discussing and casting elimination votes even after being eliminated!',
      fr: 'Continue de discuter et de voter même après avoir été éliminé !'
    }
  },
  {
    id: 'lovers',
    image: ROLE_PORTRAITS.lovers,
    accentColor: '#ec4899',
    badgeBg: 'bg-pink-500/20 border-pink-400/50 text-pink-300',
    minPlayers: 5,
    isPair: true,
    names: {
      ar: 'العشاق',
      en: 'The Lovers',
      fr: 'Les Amoureux'
    },
    descriptions: {
      ar: 'لاعبان يرتبط مصيرهما سراً (5+ لاعبين): يتعرف الشريكان على بعضهما سراً؛ وإذا تم إقصاء أحدهما يخرج الآخر معه فوراً!',
      en: 'Two players secretly linked by fate (5+ players): if one is eliminated, the other goes out immediately!',
      fr: 'Deux joueurs liés secrètement (5+ joueurs) : si l’un est éliminé, l’autre part immédiatement avec lui !'
    }
  },
  {
    id: 'avenger',
    image: ROLE_PORTRAITS.avenger,
    accentColor: '#f97316',
    badgeBg: 'bg-orange-500/20 border-orange-400/50 text-orange-300',
    minPlayers: 5,
    names: {
      ar: 'Mr. Avenger',
      en: 'Mr. Avenger',
      fr: 'Mr. Avenger'
    },
    descriptions: {
      ar: 'قد ينتمي لأي فريق (5+ لاعبين)؛ وعند إقصائه بالتصويت يختار لاعباً آخر ليُسقطه معه فوراً!',
      en: 'Can belong to any team (5+ players). When eliminated, immediately picks another player to eliminate with him!',
      fr: 'Peut appartenir à n’importe quel camp (5+ joueurs). Éliminé, il choisit un autre joueur à entraîner avec lui !'
    }
  },
  {
    id: 'mr_meme',
    image: ROLE_PORTRAITS.mr_meme,
    accentColor: '#64748b',
    badgeBg: 'bg-slate-500/20 border-slate-400/50 text-slate-300',
    minPlayers: 4,
    names: {
      ar: 'Mr. Meme',
      en: 'Mr. Meme',
      fr: 'Mr. Meme'
    },
    descriptions: {
      ar: 'يصف كلمته السرية بالإيماءات والحركات الصامتة فقط دون نطق أي كلمة!',
      en: 'Must describe his secret word strictly through silent mime gestures!',
      fr: 'Doit décrire son mot uniquement par des mimes silencieux !'
    }
  }
];

export const getRoleAsset = (role: PlayerRole): string => {
  return ROLE_PORTRAITS[role] || ROLE_PORTRAITS.citizen;
};

export const getRoleBadgeIcon = (role: PlayerRole): string => {
  return getRoleAsset(role);
};

export const getRoleTitle = (role: PlayerRole, lang: string): string => {
  if (role === 'mrwhite') return 'Mr. White';
  if (role === 'undercover') {
    return lang === 'ar' ? 'متخفٍّ' : lang === 'fr' ? 'Infiltré' : 'Undercover';
  }
  if (role === 'citizen') {
    return lang === 'ar' ? 'مدني' : lang === 'fr' ? 'Civil' : 'Civilian';
  }
  if (role === 'inspector') {
    return 'Mr. Inspector';
  }
  const found = SPECIAL_ROLES.find(r => r.id === role);
  if (found) {
    return found.names[lang] || found.names.en || role;
  }
  return role;
};

export const getSpecialRoleDescription = (role: PlayerRole, lang: string): string | null => {
  const found = SPECIAL_ROLES.find(r => r.id === role);
  if (!found) return null;
  return found.descriptions[lang] || found.descriptions.en;
};

export const isSpecialRole = (role: PlayerRole): role is SpecialRoleId => {
  return SPECIAL_ROLES.some(r => r.id === role);
};
