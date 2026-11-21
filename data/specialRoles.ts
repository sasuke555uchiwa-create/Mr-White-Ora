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
    accentColor: '#9A8866',
    badgeBg: 'bg-[#9A8866]/15 border-[#9A8866]/40 text-[#D4C39E]',
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
    accentColor: '#963F46',
    badgeBg: 'bg-[#963F46]/15 border-[#963F46]/45 text-danger-text',
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
    accentColor: '#5A819E',
    badgeBg: 'bg-[#5A819E]/15 border-[#5A819E]/45 text-cyan-text',
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
    accentColor: '#3E7B67',
    badgeBg: 'bg-[#3E7B67]/15 border-[#3E7B67]/45 text-emerald-text',
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
    accentColor: '#668F9A',
    badgeBg: 'bg-[#668F9A]/15 border-[#668F9A]/45 text-cyan-text',
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
    accentColor: '#A8826B',
    badgeBg: 'bg-[#A8826B]/15 border-[#A8826B]/45 text-primary-text',
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
    accentColor: '#A45A44',
    badgeBg: 'bg-[#A45A44]/15 border-[#A45A44]/45 text-primary-text',
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
    accentColor: '#7B8794',
    badgeBg: 'bg-[#7B8794]/15 border-[#7B8794]/40 text-text-muted',
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

export interface RoleVisualIdentity {
  stamp: string;
  accentHex: string;
  frameBorderClass: string;
  tintBgClass: string;
  titleColorClass: string;
  stampTone: 'gold' | 'cyan' | 'crimson' | 'neutral';
  abilityTag: { ar: string; en: string; fr: string };
}

const ROLE_VISUAL_MAP: Record<PlayerRole, RoleVisualIdentity> = {
  citizen: {
    stamp: 'CLEARANCE · CIV',
    accentHex: '#668F9A',
    frameBorderClass: 'border-[#668F9A]/50',
    tintBgClass: 'bg-[#668F9A]/12 border-[#668F9A]/35',
    titleColorClass: 'text-cyan-text',
    stampTone: 'cyan',
    abilityTag: {
      ar: 'عميل نظامي موثّق',
      en: 'Verified Field Operative',
      fr: 'Agent de terrain vérifié',
    },
  },
  undercover: {
    stamp: 'COVERT · ASSET',
    accentHex: '#A46F44',
    frameBorderClass: 'border-[#A46F44]/55',
    tintBgClass: 'bg-[#A46F44]/12 border-[#A46F44]/40',
    titleColorClass: 'text-[#C88D5E]',
    stampTone: 'crimson',
    abilityTag: {
      ar: 'مخترق بكلمة متقاربة',
      en: 'Deep-Cover Infiltrator',
      fr: 'Infiltré sous couverture',
    },
  },
  mrwhite: {
    stamp: 'GHOST · ZERO-KEY',
    accentHex: '#B49A62',
    frameBorderClass: 'border-[#B49A62]/60',
    tintBgClass: 'bg-[#B49A62]/12 border-[#B49A62]/45',
    titleColorClass: 'text-primary-text',
    stampTone: 'gold',
    abilityTag: {
      ar: 'بدون كلمة · تمويه كامل',
      en: 'Zero-Word Infiltrator',
      fr: 'Sans mot · Camouflage total',
    },
  },
  inspector: {
    stamp: 'AUDIT · INTEL',
    accentHex: '#668F9A',
    frameBorderClass: 'border-[#668F9A]/55',
    tintBgClass: 'bg-[#668F9A]/12 border-[#668F9A]/40',
    titleColorClass: 'text-cyan-text',
    stampTone: 'cyan',
    abilityTag: {
      ar: 'تحقيق ميداني',
      en: 'Field Investigation',
      fr: 'Enquête de terrain',
    },
  },
  fool: {
    stamp: 'DECOY · +4 PTS',
    accentHex: '#9A8866',
    frameBorderClass: 'border-[#9A8866]/55',
    tintBgClass: 'bg-[#9A8866]/12 border-[#9A8866]/40',
    titleColorClass: 'text-primary-text',
    stampTone: 'gold',
    abilityTag: {
      ar: 'هدف الإقصاء الأول (+4)',
      en: 'First-Vote Bait (+4)',
      fr: 'Appât premier vote (+4)',
    },
  },
  boomerang: {
    stamp: 'COUNTER · BOUNCE',
    accentHex: '#963F46',
    frameBorderClass: 'border-[#963F46]/55',
    tintBgClass: 'bg-[#963F46]/12 border-[#963F46]/40',
    titleColorClass: 'text-danger-text',
    stampTone: 'crimson',
    abilityTag: {
      ar: 'عكس الإقصاء لمرة واحدة',
      en: 'One-Time Vote Reversal',
      fr: 'Renvoi de vote unique',
    },
  },
  protector: {
    stamp: 'AEGIS · SHIELD',
    accentHex: '#5A819E',
    frameBorderClass: 'border-[#5A819E]/55',
    tintBgClass: 'bg-[#5A819E]/12 border-[#5A819E]/40',
    titleColorClass: 'text-cyan-text',
    stampTone: 'cyan',
    abilityTag: {
      ar: 'حماية دفاعية لمرة واحدة',
      en: 'One-Time Defense Shield',
      fr: 'Bouclier défensif unique',
    },
  },
  justice: {
    stamp: 'TRIBUNAL · VETO',
    accentHex: '#3E7B67',
    frameBorderClass: 'border-[#3E7B67]/55',
    tintBgClass: 'bg-[#3E7B67]/12 border-[#3E7B67]/40',
    titleColorClass: 'text-emerald-text',
    stampTone: 'cyan',
    abilityTag: {
      ar: 'كسر التعادل الحاسم',
      en: 'Tie-Breaking Authority',
      fr: 'Arbitre d’égalité',
    },
  },
  ghost: {
    stamp: 'SPECTRE · VOTE',
    accentHex: '#668F9A',
    frameBorderClass: 'border-[#668F9A]/55',
    tintBgClass: 'bg-[#668F9A]/12 border-[#668F9A]/40',
    titleColorClass: 'text-cyan-text',
    stampTone: 'cyan',
    abilityTag: {
      ar: 'تصويت مستمر بعد الخروج',
      en: 'Post-Elimination Vote',
      fr: 'Vote post-élimination',
    },
  },
  lovers: {
    stamp: 'PACT · LINKED',
    accentHex: '#A8826B',
    frameBorderClass: 'border-[#A8826B]/55',
    tintBgClass: 'bg-[#A8826B]/12 border-[#A8826B]/40',
    titleColorClass: 'text-[#C8A189]',
    stampTone: 'gold',
    abilityTag: {
      ar: 'ارتباط مصير مشترك',
      en: 'Shared Fate Bond',
      fr: 'Lien de destin partagé',
    },
  },
  avenger: {
    stamp: 'STRIKE · REPRISAL',
    accentHex: '#A45A44',
    frameBorderClass: 'border-[#A45A44]/55',
    tintBgClass: 'bg-[#A45A44]/12 border-[#A45A44]/40',
    titleColorClass: 'text-primary-text',
    stampTone: 'crimson',
    abilityTag: {
      ar: 'ضربة انتقامية عند الخروج',
      en: 'Final Retaliation Strike',
      fr: 'Frappe de représailles',
    },
  },
  mr_meme: {
    stamp: 'SILENT · MIME',
    accentHex: '#7B8794',
    frameBorderClass: 'border-[#7B8794]/50',
    tintBgClass: 'bg-[#7B8794]/12 border-[#7B8794]/35',
    titleColorClass: 'text-text-main',
    stampTone: 'neutral',
    abilityTag: {
      ar: 'وصف بالإيماء الصامت',
      en: 'Silent Gesture Protocol',
      fr: 'Protocole mime silencieux',
    },
  },
};

export const getRoleVisualIdentity = (role: PlayerRole, lang: string): {
  stamp: string;
  accentHex: string;
  frameBorderClass: string;
  tintBgClass: string;
  titleColorClass: string;
  stampTone: 'gold' | 'cyan' | 'crimson' | 'neutral';
  abilityLabel: string;
} => {
  const base = ROLE_VISUAL_MAP[role] || ROLE_VISUAL_MAP.citizen;
  const normalizedLang = lang === 'sa' ? 'ar' : lang;
  const abilityLabel =
    base.abilityTag[normalizedLang as 'ar' | 'en' | 'fr'] || base.abilityTag.en;
  return {
    stamp: base.stamp,
    accentHex: base.accentHex,
    frameBorderClass: base.frameBorderClass,
    tintBgClass: base.tintBgClass,
    titleColorClass: base.titleColorClass,
    stampTone: base.stampTone,
    abilityLabel,
  };
};

