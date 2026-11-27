import { GameMode } from '../types';

export type OperationEventTone = 'gold' | 'cyan' | 'crimson';

export interface OperationEventCard {
  id: string;
  code: string;
  tone: OperationEventTone;
  modeCompatibility: 'both' | GameMode;
  exposesSecretInfo: false;
  modifiesScoring: false;
  titles: { ar: string; en: string; fr: string };
  rules: { ar: string; en: string; fr: string };
  tip: { ar: string; en: string; fr: string };
}

export const OPERATION_EVENTS: OperationEventCard[] = [
  {
    id: 'one_word_cipher',
    code: 'EVT-01',
    tone: 'gold',
    modeCompatibility: 'expression',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'كلمة واحدة فقط',
      en: 'One-Word Cipher',
      fr: 'Mot Unique',
    },
    rules: {
      ar: 'يجب أن يقتصر كل تلميح في هذه الجولة على كلمة واحدة مفردة دون شرح إضافي.',
      en: 'Every clue in this round must be strictly one single word with no extra phrase.',
      fr: 'Chaque indice de cette manche doit tenir en un seul mot, sans phrase.',
    },
    tip: {
      ar: 'اختر كلمة دقيقة دون أن تمنح المتسلل خيطاً مباشراً.',
      en: 'Be precise without handing Mr. White an easy anchor.',
      fr: 'Soyez précis sans offrir un repère facile à Mr. White.',
    },
  },
  {
    id: 'interrogation_spotlight',
    code: 'EVT-02',
    tone: 'crimson',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'استجواب مباشر',
      en: 'Interrogation Spotlight',
      fr: 'Interrogatoire Ciblé',
    },
    rules: {
      ar: 'بعد أن ينهي اللاعب دوره، يوجّه سؤالاً سريعاً للاعب يختاره قبل انتقال الدور.',
      en: 'After giving a clue, the speaker asks one quick follow-up question to any operative.',
      fr: 'Après son indice, le joueur pose une question rapide au joueur de son choix.',
    },
    tip: {
      ar: 'راقب التردد في الإجابة أكثر من الإجابة نفسها.',
      en: 'Watch reaction speed as closely as the answer.',
      fr: 'Observez la réactivité autant que la réponse.',
    },
  },
  {
    id: 'redacted_evidence',
    code: 'EVT-03',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'دليل محجوب',
      en: 'Redacted Evidence',
      fr: 'Preuve Caviardée',
    },
    rules: {
      ar: 'يُمنع ذكر الفئة العامة أو اللون أو الحجم في التلميحات والأسئلة خلال هذه الجولة.',
      en: 'Do not mention broad categories, colors, or sizes in clues or questions this round.',
      fr: 'Interdiction de mentionner la catégorie générale, la couleur ou la taille.',
    },
    tip: {
      ar: 'ركز على الوظيفة أو الشعور المرتبط بالكلمة.',
      en: 'Focus on function, context, or sensation instead.',
      fr: 'Misez sur l’usage, le contexte ou la sensation.',
    },
  },
  {
    id: 'analogy_protocol',
    code: 'EVT-04',
    tone: 'gold',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'بروتوكول التشبيه',
      en: 'Analogy Protocol',
      fr: 'Protocole d’Analogie',
    },
    rules: {
      ar: 'قدّم تلميحك على شكل تشبيه بمكان أو لحظة يومية بدلاً من وصف الشيء مباشرة.',
      en: 'Frame your clue as an analogy to a place or everyday moment rather than a literal trait.',
      fr: 'Formulez votre indice comme une analogie avec un lieu ou un moment.',
    },
    tip: {
      ar: 'التشبيهات تكشف من يملك الكلمة القريبة دون كشف المعنى الكامل.',
      en: 'Analogies expose decoy words while protecting the exact secret.',
      fr: 'Les analogies révèlent les mots proches sans dévoiler le secret.',
    },
  },
  {
    id: 'reverse_table_order',
    code: 'EVT-05',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'عكس مسار الطاولة',
      en: 'Reverse Briefing Order',
      fr: 'Ordre Inversé',
    },
    rules: {
      ar: 'يبدأ النقاش والتعليق الشفهي من آخر اسم على الطاولة نحو الأول بعد انتهاء الدور.',
      en: 'Table follow-up discussion runs in reverse seat order after clues finish.',
      fr: 'La discussion autour de la table se fait en sens inverse après les indices.',
    },
    tip: {
      ar: 'تغيير الترتيب يربك من يعتمد على تقليد من سبقه.',
      en: 'Flipping the rhythm disrupts players who copy earlier speakers.',
      fr: 'Inverser l’ordre déstabilise ceux qui imitent les premiers.',
    },
  },
  {
    id: 'spotlight_challenge',
    code: 'EVT-06',
    tone: 'crimson',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'تحت الأضواء',
      en: 'Spotlight Focus',
      fr: 'Sous les Projecteurs',
    },
    rules: {
      ar: 'يختار كل متحدث لاعباً واحداً ليعلق على مدى وضوح تلميح ذلك اللاعب.',
      en: 'Each speaker briefly rates whether one chosen player sounded clear or evasive.',
      fr: 'Chaque intervenant indique si l’indice d’un joueur lui semble clair ou flou.',
    },
    tip: {
      ar: 'انتبه لمن يحاول تشتيت الانتباه عن المشتبه الحقيقي.',
      en: 'Notice who deflects pressure away from suspect clues.',
      fr: 'Repérez qui détourne l’attention des indices suspects.',
    },
  },
  {
    id: 'silent_ballot_prep',
    code: 'EVT-07',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'صمت قبل التصويت',
      en: 'Silent Ballot Protocol',
      fr: 'Protocole Silence',
    },
    rules: {
      ar: 'عند سماع كل تلميح، التزموا الصمت دون تعليقات جانبية حتى يفتح التصويت.',
      en: 'Zero side chatter after clues are spoken until the voting phase opens.',
      fr: 'Aucun commentaire latéral après les indices jusqu’à l’ouverture du vote.',
    },
    tip: {
      ar: 'الصمت يمنع المتسلل من تصحيح مساره.',
      en: 'Silence prevents infiltrators from reading table reactions early.',
      fr: 'Le silence empêche les infiltrés d’ajuster leur jeu.',
    },
  },
  {
    id: 'synonym_lock',
    code: 'EVT-08',
    tone: 'gold',
    modeCompatibility: 'expression',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'منع التكرار والمرادفات',
      en: 'No-Echo Rule',
      fr: 'Zéro Répétition',
    },
    rules: {
      ar: 'يُمنع استخدام أي كلمة قريبة أو مرادف لتلميح ذكره لاعب سابق في نفس الجولة.',
      en: 'Cannot reuse any synonym or close variation of an earlier clue this round.',
      fr: 'Interdiction d’utiliser un synonyme d’un indice déjà donné.',
    },
    tip: {
      ar: 'كل دور يضيق الخناق على من يرتجل دون كلمة.',
      en: 'Late speakers must prove real knowledge under tighter bounds.',
      fr: 'Les derniers orateurs doivent prouver qu’ils ont le bon mot.',
    },
  },
  {
    id: 'sensory_signal',
    code: 'EVT-09',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'إشارة حسية',
      en: 'Sensory Signal',
      fr: 'Signal Sensoriel',
    },
    rules: {
      ar: 'اربط تلميحك أو سؤالك بالصوت أو الرائحة أو الحركة أو الملمس فقط.',
      en: 'Anchor your clue or question purely in sound, scent, texture, or motion.',
      fr: 'Ancrez votre indice uniquement dans un son, une odeur, une texture ou un geste.',
    },
    tip: {
      ar: 'الصفات الحسية تفضح الاختلاف الدقيق بين كلمتين متقاربتين.',
      en: 'Sensory angles quickly expose subtle differences between paired words.',
      fr: 'Les détails sensoriels révèlent vite l’écart entre deux mots proches.',
    },
  },
  {
    id: 'verb_only_clue',
    code: 'EVT-10',
    tone: 'gold',
    modeCompatibility: 'expression',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'أفعال فقط',
      en: 'Action Verbs Only',
      fr: 'Verbes d’Action Uniquement',
    },
    rules: {
      ar: 'يجب أن يكون تلميحك فعلاً يصف ماذا نفعل بالكلمة السرية أو أين نستخدمها.',
      en: 'Your clue must be an action verb describing how someone interacts with the word.',
      fr: 'Votre indice doit être un verbe décrivant ce qu’on fait avec le mot.',
    },
    tip: {
      ar: 'الأفعال تكشف الاستخدام العملي بسرعة.',
      en: 'Verbs separate lookalike objects by purpose.',
      fr: 'Les verbes distinguent vite deux objets similaires par leur usage.',
    },
  },
  {
    id: 'rapid_pulse',
    code: 'EVT-11',
    tone: 'crimson',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'نبض سريع',
      en: 'Rapid Pulse',
      fr: 'Rythme Rapide',
    },
    rules: {
      ar: 'أجب خلال أول 5 ثوانٍ من استلام الدور دون توقف طويل للتفكير.',
      en: 'Deliver your clue or answer within the first 5 seconds of your turn.',
      fr: 'Donnez votre indice ou réponse dans les 5 premières secondes.',
    },
    tip: {
      ar: 'السرعة تكشف التلقائية عند المدنيين والارتباك عند المتخفي.',
      en: 'Spontaneous answers reward genuine confidence.',
      fr: 'La spontanéité met la pression sur ceux qui improvisent.',
    },
  },
  {
    id: 'two_word_pair',
    code: 'EVT-12',
    tone: 'gold',
    modeCompatibility: 'expression',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'كلمتان متباعدتان',
      en: 'Two-Word Contrast',
      fr: 'Contraste en Deux Mots',
    },
    rules: {
      ar: 'أعطِ كلمتين منفصلتين لا جملة: إحداهما توقيت والأخرى مكان أو شعور.',
      en: 'Give two detached words: one timing clue and one place or mood clue.',
      fr: 'Donnez deux mots séparés : un repère temporel et un lieu ou ambiance.',
    },
    tip: {
      ar: 'الجمع بين الزمان والمكان يعطي إشارة غنية للمدنيين.',
      en: 'Time + place gives allies clear verification.',
      fr: 'Temps + lieu offre un bon repère aux alliés.',
    },
  },
  {
    id: 'memory_audit',
    code: 'EVT-13',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'اختبار الذاكرة',
      en: 'Memory Audit',
      fr: 'Audit Mémoire',
    },
    rules: {
      ar: 'يُمنع فتح سجل الأوصاف أثناء النقاش الشفهي؛ اعتمدوا على تركيزكم فقط.',
      en: 'Keep the written clue log closed during verbal debate; rely strictly on memory.',
      fr: 'Gardez le journal des indices fermé pendant le débat oral.',
    },
    tip: {
      ar: 'انتبه للتناقض بين جولة وأخرى.',
      en: 'Catch contradictions across earlier statements.',
      fr: 'Repérez les contradictions entre deux déclarations.',
    },
  },
  {
    id: 'double_echo',
    code: 'EVT-14',
    tone: 'gold',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'تأكيد الثقة',
      en: 'Trust Echo',
      fr: 'Écho de Confiance',
    },
    rules: {
      ar: 'قبل تقديم تلميحك، سمِّ لاعباً واحداً شعرت أن تلميحه كان أقرب للحقيقة.',
      en: 'Before speaking your clue, name one earlier speaker whose hint you trust.',
      fr: 'Avant votre indice, citez un joueur précédent dont l’indice vous inspire confiance.',
    },
    tip: {
      ar: 'التحالفات المبكرة تساعد على كشف من يساير الجميع.',
      en: 'Early endorsements reveal who is quietly aligning with whom.',
      fr: 'Les soutiens précoces révèlent les alliances discrètes.',
    },
  },
  {
    id: 'yes_no_constraint',
    code: 'EVT-15',
    tone: 'crimson',
    modeCompatibility: 'question',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'نعم أو لا فقط',
      en: 'Binary Interrogation',
      fr: 'Questions Fermées',
    },
    rules: {
      ar: 'في نمط الأسئلة، يجب أن تكون الإجابة بنعم أو لا أو أحياناً فقط دون تبرير.',
      en: 'Answers must strictly be Yes, No, or Sometimes with zero extra explanation.',
      fr: 'Répondez uniquement par Oui, Non ou Parfois, sans justification.',
    },
    tip: {
      ar: 'اسأل أسئلة حاسمة تضع المتخفي في زاوية ضيقة.',
      en: 'Ask sharp yes/no questions that split decoy concepts.',
      fr: 'Posez des questions fermées qui séparent les deux mots.',
    },
  },
  {
    id: 'contextual_scene',
    code: 'EVT-16',
    tone: 'cyan',
    modeCompatibility: 'both',
    exposesSecretInfo: false,
    modifiesScoring: false,
    titles: {
      ar: 'مشهد من ثلاث كلمات',
      en: 'Three-Word Scene',
      fr: 'Scène en Trois Mots',
    },
    rules: {
      ar: 'صف مشهداً قصيراً لا يتجاوز 3 كلمات يظهر فيه هذا الشيء أو الشعور.',
      en: 'Sketch a tiny 3-word scene where the concept naturally appears.',
      fr: 'Esquissez une mini-scène de 3 mots où le concept apparaît.',
    },
    tip: {
      ar: 'المشاهد السياقية تمتحن صدق التفصيل.',
      en: 'Tiny scenes reveal genuine familiarity immediately.',
      fr: 'Une scène courte révèle vite qui connaît vraiment le mot.',
    },
  },
];

export function pickOperationEvent(params: {
  gameMode: GameMode;
  round: number;
  excludeIds?: string[];
  rng?: () => number;
}): OperationEventCard {
  const { gameMode, excludeIds = [], rng = Math.random } = params;
  const compatible = OPERATION_EVENTS.filter(
    (evt) => evt.modeCompatibility === 'both' || evt.modeCompatibility === gameMode
  );
  const fresh = compatible.filter((evt) => !excludeIds.includes(evt.id));
  const pool = fresh.length > 0 ? fresh : compatible;
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(pool.length - 1, Math.max(0, idx))];
}
