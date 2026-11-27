import { MAFIA_ROLE_PORTRAITS } from '../../design/assetRegistry';
import { MafiaFaction, MafiaRoleId } from './mafiaTypes';

export interface MafiaRoleMetadata {
  id: MafiaRoleId;
  faction: MafiaFaction;
  portrait: string;
  tone: 'gold' | 'cyan' | 'crimson' | 'emerald';
  titles: { ar: string; en: string; fr: string };
  stamps: { ar: string; en: string; fr: string };
  descriptions: { ar: string; en: string; fr: string };
  nightActionHint: { ar: string; en: string; fr: string };
}

export const MAFIA_ROLE_CATALOG: Record<MafiaRoleId, MafiaRoleMetadata> = {
  citizen: {
    id: 'citizen',
    faction: 'city',
    portrait: MAFIA_ROLE_PORTRAITS.citizen,
    tone: 'cyan',
    titles: {
      ar: 'مواطن المدينة',
      en: 'City Resident',
      fr: 'Citoyen',
    },
    stamps: {
      ar: 'فريق المدينة',
      en: 'CITY TEAM',
      fr: 'ÉQUIPE CITÉ',
    },
    descriptions: {
      ar: 'مواطن شريف يسعى لكشف خيوط المافيا خلال النقاش الصباحي وإقصائهم بالتصويت السري.',
      en: 'Honest resident who observes table reactions, debates suspects, and votes Mafia out.',
      fr: 'Habitant honnête qui analyse les débats et vote pour démasquer la Mafia.',
    },
    nightActionHint: {
      ar: 'تستريح ليلاً وتراقب نتائج الفجر في الصباح.',
      en: 'Rests during the night and watches dawn developments.',
      fr: 'Se repose la nuit et découvre les événements à l’aube.',
    },
  },
  detective: {
    id: 'detective',
    faction: 'city',
    portrait: MAFIA_ROLE_PORTRAITS.detective,
    tone: 'cyan',
    titles: {
      ar: 'المحقق السري',
      en: 'Detective',
      fr: 'Détective',
    },
    stamps: {
      ar: 'تحقيق ليلي',
      en: 'NIGHT SCAN',
      fr: 'ENQUÊTE',
    },
    descriptions: {
      ar: 'يفحص كل ليلة لاعباً واحداً بسرية تامة لمعرفة انتمائه (المدينة أم المافيا). احذر: زعيم المافيا يظهر بريئاً!',
      en: 'Investigates one living player each night to learn City vs. Mafia allegiance (Boss reads as City).',
      fr: 'Enquête chaque nuit sur un joueur pour savoir s’il appartient à la Cité ou à la Mafia (le Parrain paraît innocent).',
    },
    nightActionHint: {
      ar: 'اختر مشتبهاً به لفحص ملفه سراً في هذه الليلة.',
      en: 'Select one living player to scan privately tonight.',
      fr: 'Choisissez un joueur vivant à vérifier en secret cette nuit.',
    },
  },
  doctor: {
    id: 'doctor',
    faction: 'city',
    portrait: MAFIA_ROLE_PORTRAITS.doctor,
    tone: 'emerald',
    titles: {
      ar: 'الطبيب الميداني',
      en: 'Doctor',
      fr: 'Médecin',
    },
    stamps: {
      ar: 'درع الحماية',
      en: 'PROTECTION',
      fr: 'PROTECTION',
    },
    descriptions: {
      ar: 'يحمي كل ليلة لاعباً واحداً (بما في ذلك نفسه وفق الإعدادات) لمنع استهدافه من المافيا.',
      en: 'Protects one living player each night to block a Mafia night removal.',
      fr: 'Protège un joueur vivant chaque nuit pour empêcher l’attaque de la Mafia.',
    },
    nightActionHint: {
      ar: 'اختر من تحميه الليلة بدرعك الطبي.',
      en: 'Choose who receives medical protection tonight.',
      fr: 'Choisissez qui protéger cette nuit.',
    },
  },
  mafia: {
    id: 'mafia',
    faction: 'mafia',
    portrait: MAFIA_ROLE_PORTRAITS.mafia,
    tone: 'crimson',
    titles: {
      ar: 'عضو المافيا',
      en: 'Mafia Operative',
      fr: 'Membre de la Mafia',
    },
    stamps: {
      ar: 'عصابة الظلال',
      en: 'SYNDICATE',
      fr: 'SYNDICAT',
    },
    descriptions: {
      ar: 'يعرف أعضاء فريقه من البداية ويعمل معهم ليلاً لإخراج لاعبي المدينة حتى يتساوى العدد أو تتفوق المافيا.',
      en: 'Knows Mafia teammates from the start and coordinates nightly removals until parity.',
      fr: 'Connaît ses alliés dès le début et élimine secrètement les citoyens jusqu’à la parité.',
    },
    nightActionHint: {
      ar: 'تشاور بصمت مع فريقك واختر هدف الليلة.',
      en: 'Coordinate silently with your syndicate and lock tonight’s target.',
      fr: 'Choisissez secrètement la cible nocturne avec votre camp.',
    },
  },
  mafia_boss: {
    id: 'mafia_boss',
    faction: 'mafia',
    portrait: MAFIA_ROLE_PORTRAITS.mafia_boss,
    tone: 'gold',
    titles: {
      ar: 'زعيم المافيا',
      en: 'Mafia Boss',
      fr: 'Parrain',
    },
    stamps: {
      ar: 'قيادة الظلال',
      en: 'SHADOW BOSS',
      fr: 'PARRAIN',
    },
    descriptions: {
      ar: 'يقود المافيا بغطاء قانوني محكم: إذا فحصه المحقق ليلاً يظهر ملفه كعضو من المدينة!',
      en: 'Leads the Mafia with deep cover — appears as City to Detective night scans!',
      fr: 'Dirige la Mafia sous couverture — apparaît comme Citoyen lors des enquêtes du Détective !',
    },
    nightActionHint: {
      ar: 'قد عملية الليلة وحافظ على غطائك النظيف أمام المحقق.',
      en: 'Direct tonight’s Mafia strike while maintaining City cover.',
      fr: 'Dirigez l’opération nocturne tout en gardant votre couverture.',
    },
  },
};

export function getMafiaRoleMeta(role: MafiaRoleId): MafiaRoleMetadata {
  return MAFIA_ROLE_CATALOG[role] || MAFIA_ROLE_CATALOG.citizen;
}

export function getMafiaRoleLabel(role: MafiaRoleId, lang: string): string {
  const meta = getMafiaRoleMeta(role);
  if (lang === 'ar' || lang === 'sa') return meta.titles.ar;
  if (lang === 'fr') return meta.titles.fr;
  return meta.titles.en;
}
