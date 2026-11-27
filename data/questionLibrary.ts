export type ChallengeLanguage = 'ar' | 'tn' | 'en' | 'fr';

export type ChallengeTopicPack =
  | 'general_knowledge'
  | 'geography'
  | 'food'
  | 'animals'
  | 'technology'
  | 'sports'
  | 'history'
  | 'cinema'
  | 'everyday_life'
  | 'difficult_deduction';

export type ChallengeInteractionStyle =
  | 'direct_question'
  | 'analogy'
  | 'association'
  | 'restricted_description'
  | 'quick_response'
  | 'contextual_example';

export type ChallengeDifficulty = 'easy' | 'hard';

export interface ChallengePrompt {
  id: string;
  topicPack: ChallengeTopicPack;
  style: ChallengeInteractionStyle;
  difficulty: ChallengeDifficulty;
  prompts: Record<ChallengeLanguage, string>;
}

export const CHALLENGE_TOPIC_PACKS: {
  id: ChallengeTopicPack;
  labels: Record<ChallengeLanguage, string>;
}[] = [
  {
    id: 'general_knowledge',
    labels: { ar: 'معرفة عامة', tn: 'ثقافة عامة', en: 'General Knowledge', fr: 'Culture Générale' },
  },
  {
    id: 'geography',
    labels: { ar: 'جغرافيا', tn: 'جغرافيا وبلايص', en: 'Geography', fr: 'Géographie' },
  },
  {
    id: 'food',
    labels: { ar: 'طعام ومطبخ', tn: 'ماكلة وكوجينة', en: 'Food', fr: 'Cuisine' },
  },
  {
    id: 'animals',
    labels: { ar: 'حيوانات', tn: 'حيوانات', en: 'Animals', fr: 'Animaux' },
  },
  {
    id: 'technology',
    labels: { ar: 'تقنية', tn: 'تكنولوجيا', en: 'Technology', fr: 'Technologie' },
  },
  {
    id: 'sports',
    labels: { ar: 'رياضة', tn: 'سبور ورياضة', en: 'Sports', fr: 'Sports' },
  },
  {
    id: 'history',
    labels: { ar: 'تاريخ', tn: 'تاريخ', en: 'History', fr: 'Histoire' },
  },
  {
    id: 'cinema',
    labels: { ar: 'سينما', tn: 'أفلام وسينما', en: 'Cinema', fr: 'Cinéma' },
  },
  {
    id: 'everyday_life',
    labels: { ar: 'الحياة اليومية', tn: 'الحياة اليومية', en: 'Everyday Life', fr: 'Vie Quotidienne' },
  },
  {
    id: 'difficult_deduction',
    labels: { ar: 'استنتاج صعب', tn: 'تخمام صعيب', en: 'Difficult Deduction', fr: 'Déduction Difficile' },
  },
];

export const CHALLENGE_INTERACTION_STYLES: {
  id: ChallengeInteractionStyle;
  labels: Record<ChallengeLanguage, string>;
}[] = [
  {
    id: 'direct_question',
    labels: { ar: 'سؤال مباشر', tn: 'سؤال ديركت', en: 'Direct Question', fr: 'Question Directe' },
  },
  {
    id: 'analogy',
    labels: { ar: 'تشبيه', tn: 'تشبيه', en: 'Analogy', fr: 'Analogie' },
  },
  {
    id: 'association',
    labels: { ar: 'ترابط ذهني', tn: 'شنوة يجي في بالك', en: 'Association', fr: 'Association' },
  },
  {
    id: 'restricted_description',
    labels: { ar: 'وصف مقيد', tn: 'وصف بشروط', en: 'Restricted Description', fr: 'Description Restreinte' },
  },
  {
    id: 'quick_response',
    labels: { ar: 'استجابة سريعة', tn: 'جاوب فيسع', en: 'Quick Response', fr: 'Réponse Rapide' },
  },
  {
    id: 'contextual_example',
    labels: { ar: 'مثال سياقي', tn: 'مثال من الواقع', en: 'Contextual Example', fr: 'Exemple Contextuel' },
  },
];

interface PackSeed {
  pack: ChallengeTopicPack;
  items: {
    style: ChallengeInteractionStyle;
    difficulty: ChallengeDifficulty;
    ar: string;
    tn: string;
    en: string;
    fr: string;
  }[];
}

const PACK_SEEDS: PackSeed[] = [
  {
    pack: 'general_knowledge',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل تجد هذا في كل بيت تقريباً أم في أماكن مخصصة فقط؟',
        tn: 'تلقاه في كل دار وإلا في بلايص معينة كهو؟',
        en: 'Would you find this in almost every home or only specialized places?',
        fr: 'Le trouve-t-on dans presque chaque foyer ou seulement des lieux précis ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان هذا الموضوع فصلاً من فصول السنة، أي فصل يشبه ولماذا؟',
        tn: 'كان جت الحاجة هذي فصل من العام، أنهو فصل تشبه وعلاش؟',
        en: 'If this concept were a season of the year, which one would it feel like?',
        fr: 'Si ce concept était une saison, à laquelle ressemblerait-il ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'اذكر أول مهنة تخطر ببالك عند سماع هذه الكلمة.',
        tn: 'قول أول خدمة تجي في بالك كي تسمع الكلمة هذي.',
        en: 'Name the very first profession you associate with this word.',
        fr: 'Citez le premier métier qui vous vient à l’esprit.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف دوره في الحياة دون استخدام أي اسم مادة أو لون.',
        tn: 'اوصف فايدتو من غير ما تقول لا لونو لا المادة متاعو.',
        en: 'Describe its role without naming any material or color.',
        fr: 'Décrivez son rôle sans citer ni matière ni couleur.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'في ثلاث كلمات فقط: ماذا يحدث لو اختفى تماماً ليوم واحد؟',
        tn: 'في 3 كلمات كهو: شنوة يصير كان يضيع نهار كامل؟',
        en: 'In three words: what breaks if it vanishes for a single day?',
        fr: 'En trois mots : que se passe-t-il s’il disparaît un jour ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'اذكر موقفاً غير معتاد يمكن أن يفاجئك وجوده فيه.',
        tn: 'قول موقف غريب تتفاجأ كان تلقاه موجود فيه.',
        en: 'Give an unexpected situation where encountering this would surprise you.',
        fr: 'Donnez un contexte inattendu où le croiser serait surprenant.',
      },
    ],
  },
  {
    pack: 'geography',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل تقترب الأجواء هنا من البحر أم من اليابسة الداخلية؟',
        tn: 'البلاصة هذي قريبة للبحر وإلا داخلية؟',
        en: 'Is this associated more with coastlines or inland terrain?',
        fr: 'Est-ce plutôt lié au littoral ou aux terres intérieures ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'شبه المكان بوسيلة سفر تليق به.',
        tn: 'شبه البلاصة هذي بوسيلة نقل توالمها.',
        en: 'Compare this place or landmark to the vehicle that fits it best.',
        fr: 'Comparez ce lieu au moyen de transport qui lui correspond le mieux.',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'ما الطقس الذي تتخيله فوراً عند زيارة هذا المكان؟',
        tn: 'شنوة الطقس اللي يجي في مخك طول كي تتخيل البلاصة هذي؟',
        en: 'What weather condition immediately comes to mind for this destination?',
        fr: 'Quelle météo associez-vous immédiatement à cette destination ?',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف الأفق الذي تراه هناك دون ذكر الماء أو الرمل أو الجبال.',
        tn: 'اوصف المنظر اللي تشوفو غادي من غير ما تذكر لا بحر لا رمل لا جبل.',
        en: 'Describe the horizon there without saying water, sand, or mountain.',
        fr: 'Décrivez l’horizon sans prononcer eau, sable ou montagne.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'شيء واحد تحزمه في حقيبتك قبل التوجه إليه؟',
        tn: 'حاجة وحدة تهزها في ساكك قبل ما تمشي لغادي؟',
        en: 'One essential item you pack before heading there?',
        fr: 'Un seul objet indispensable à mettre dans votre valise ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'صف ساعة الغروب في هذا المكان بجملة موجزة.',
        tn: 'اوصف وقت الغروب في البلاصة هذي في جملة قصيرة.',
        en: 'Describe sunset in that setting in one concise phrase.',
        fr: 'Décrivez le coucher de soleil dans ce cadre en une phrase courte.',
      },
    ],
  },
  {
    pack: 'food',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل يُقدَّم ساخناً في العادة أم بارداً؟',
        tn: 'يتاكل سخون بالعادة وإلا بارد؟',
        en: 'Is this usually served hot or cold?',
        fr: 'Est-ce servi plutôt chaud ou froid ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان نغمة موسيقية، هل هو هادئ أم قوي وحاد؟',
        tn: 'كان جا غناية، يجي هادي وإلا قوي وحار؟',
        en: 'If this flavor were music, would it be mellow or intense?',
        fr: 'Si cette saveur était une musique, serait-elle douce ou intense ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'اذكر المشروب أو الطبق المرافق الذي يكمله.',
        tn: 'قول المشروب وإلا الماكلة اللي تمشي معاه.',
        en: 'Name the drink or side dish that naturally pairs with it.',
        fr: 'Citez la boisson ou l’accompagnement qui va avec.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف قوامه دون ذكر الحلاوة أو الملوحة أو الحرورة.',
        tn: 'اوصف قوامو من غير ما تقول حلو ولا مالح ولا حار.',
        en: 'Describe its texture without using sweet, salty, or spicy.',
        fr: 'Décrivez sa texture sans dire sucré, salé ou épicé.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'في كلمة واحدة: فطور أم غداء أم سهرة؟',
        tn: 'في كلمة وحدة: فطور صباح، فطور نص نهار وإلا سهرية؟',
        en: 'In one word: breakfast, lunch, or late-night treat?',
        fr: 'En un mot : matin, midi ou soirée ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'متى يكون تحضيره في البيت اختبار صبر؟',
        tn: 'وقتاش تطييبو في الدار يطلب برشا صبر؟',
        en: 'When does preparing this at home test someone’s patience?',
        fr: 'Quand sa préparation maison met-elle la patience à l’épreuve ?',
      },
    ],
  },
  {
    pack: 'animals',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل يتحرك أكثر في النهار أم ينشط في الليل؟',
        tn: 'يتحرك أكثر في النهار وإلا ينشط في الليل؟',
        en: 'Is it mostly active by day or does it come alive at night?',
        fr: 'Est-il actif le jour ou plutôt nocturne ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان شخصية في فريق عمل، ما دوره بين الأصدقاء؟',
        tn: 'كان جا واحد من الشلة، شنوة يكون طبعو؟',
        en: 'If it were a person in a squad, what personality role would it have?',
        fr: 'S’il faisait partie d’une équipe, quel serait son tempérament ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'اذكر بيئة طبيعية لا يتصور وجوده خارجها.',
        tn: 'قول بلاصة طبيعية ما تتصوروش يعيش خارجها.',
        en: 'Name a natural habitat you immediately link with it.',
        fr: 'Citez un habitat naturel indissociable de cet animal.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف طريقة حركته دون ذكر الأرجل أو الأجنحة أو الزعانف.',
        tn: 'اوصف كيفاش يتحرك من غير ما تجبد الساقين ولا الجناحات ولا الزعانف.',
        en: 'Describe how it moves without mentioning legs, wings, or fins.',
        fr: 'Décrivez son déplacement sans dire pattes, ailes ou nageoires.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'أسرع صفة: حذر أم فضولي أم جريء؟',
        tn: 'أسرع وصف: حذر، فضولي وإلا جريء؟',
        en: 'Quick call: cautious, curious, or bold?',
        fr: 'Réponse éclair : prudent, curieux ou audacieux ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'صف كيف يتصرف عند الشعور بالخطر أو المفاجأة.',
        tn: 'قول كيفاش يتصرف كي يحس بخطر وإلا حاجة تفجعو.',
        en: 'Give an example of how it reacts when startled.',
        fr: 'Donnez un exemple de sa réaction face au danger.',
      },
    ],
  },
  {
    pack: 'technology',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل تحمله معك في جيبك أم يبقى ثابتاً على المكتب؟',
        tn: 'تهزو معاك في جيبك وإلا يبقى راكح فوق البيرو؟',
        en: 'Do you carry it in your pocket or keep it stationary on a desk?',
        fr: 'Le gardez-vous en poche ou fixe sur un bureau ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان أداة قديمة قبل اختراع الكهرباء، ماذا كان سيعوضه؟',
        tn: 'قبل الضو والتكنولوجيا، شنوة كان يعوضو؟',
        en: 'Before electricity, what traditional tool did a similar job?',
        fr: 'Avant l’électricité, quel outil ancien jouait un rôle proche ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'ما الصوت أو الإشعار المرتبط به في ذهنك؟',
        tn: 'شنوة الصوت وإلا الإشعار اللي يذكرك بيه؟',
        en: 'What sound or notification immediately reminds you of it?',
        fr: 'Quel son ou signal vous y fait tout de suite penser ?',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف فائدته دون قول كلمة شاشة أو بطارية أو إنترنت.',
        tn: 'اوصف فايدتو من غير ما تقول شاشة، باتري ولا أنترنت.',
        en: 'Explain its value without saying screen, battery, or internet.',
        fr: 'Expliquez son utilité sans dire écran, batterie ou internet.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'أهم زر أو حركة للتحكم فيه؟',
        tn: 'أهم قفلة وإلا جست تستعملو بيه؟',
        en: 'Single most used gesture or button for it?',
        fr: 'Le geste ou bouton le plus utilisé ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'متى يسبب تعطله إرباكاً كبيراً وسط اجتماع أو سفر؟',
        tn: 'وقتاش كي يطفى يعملك مشكلة كبيرة في خدمة وإلا سفر؟',
        en: 'Give a moment when its failure ruins a trip or meeting.',
        fr: 'Donnez un moment où sa panne complique un voyage ou une réunion.',
      },
    ],
  },
  {
    pack: 'sports',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل يمارس غالباً بشكل فردي أم ضمن فريق؟',
        tn: 'يتلعب بالواحد وإلا في فريق؟',
        en: 'Is this mostly individual or played as a team?',
        fr: 'Est-ce plutôt individuel ou collectif ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'شبه وتيرته بحالة حركة: عدو سريع أم شطرنج هادئ؟',
        tn: 'شبه ريتمو: جري فيسع وإلا تركيز هادي؟',
        en: 'Compare its rhythm: sprint chaos or patient chess?',
        fr: 'Comparez son rythme : sprint explosif ou partie d’échecs ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'ما القطعة أو اللباس الذي يميزه فوراً؟',
        tn: 'شنوة الحاجة اللي تميزو مالنظرة الأولى؟',
        en: 'What gear or uniform instantly identifies it?',
        fr: 'Quel équipement ou tenue l’identifie aussitôt ?',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف هدف اللعبة دون استخدام كلمات كرة أو مرمى أو نقطة.',
        tn: 'اوصف كيفاش تربح من غير ما تقول كورة، شبكة ولا بوان.',
        en: 'Explain how you win without saying ball, goal, or score.',
        fr: 'Expliquez comment gagner sans dire balle, but ou point.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'في كلمة واحدة: لياقة أم دقة أم تكتيك؟',
        tn: 'في كلمة وحدة: نفس، دقة وإلا تكتيك؟',
        en: 'One word priority: stamina, precision, or tactics?',
        fr: 'Priorité en un mot : endurance, précision ou tactique ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'اذكر لحظة حبس أنفاس مميزة في الدقائق الأخيرة.',
        tn: 'احكي على لحظة تحبس الأنفاس في الدقايق الأخيرة.',
        en: 'Describe a classic nail-biting final-minute moment.',
        fr: 'Décrivez un moment décisif de dernière minute.',
      },
    ],
  },
  {
    pack: 'history',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل ينتمي إلى العصور القديمة أم إلى التاريخ الحديث؟',
        tn: 'هذا من وقت بكري برشا وإلا من التاريخ القريب؟',
        en: 'Does this belong to ancient eras or modern history?',
        fr: 'Cela appartient-il à l’Antiquité ou à l’époque moderne ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان أثراً محفوظاً في متحف، بأي قاعة يُعرض؟',
        tn: 'كان تلقاه في متحف، في أنهو جناح يحطوه؟',
        en: 'If displayed in a museum, which wing would house it?',
        fr: 'Exposé dans un musée, dans quelle salle serait-il ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'اذكر مادة أو رمزاً ارتبط بتلك الحقبة.',
        tn: 'قول مادة وإلا رمز معروف في الفترة هاكي.',
        en: 'Name a material or emblem iconic to that era.',
        fr: 'Citez une matière ou un emblème typique de cette époque.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف تأثيره في الناس دون ذكر كلمة ملك أو حرب أو سنة.',
        tn: 'اوصف كيفاش بدّل حياة الناس من غير ما تقول ملك، حرب ولا عام.',
        en: 'Describe its impact without saying king, war, or year.',
        fr: 'Décrivez son impact sans dire roi, guerre ou année.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'حجر أم ورق أم معدن؟ اختر الأقرب.',
        tn: 'حجر، ورق وإلا معدن؟ اختار الأقرب.',
        en: 'Stone, parchment, or metal — pick the closest anchor.',
        fr: 'Pierre, parchemin ou métal — choisissez le plus proche.',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'ما الأثر الذي ما زال باقياً منه في حياتنا اليوم؟',
        tn: 'شنوة الأثر اللي مازال موجود منو حتى لليوم؟',
        en: 'Give an example of how its legacy still shows up today.',
        fr: 'Donnez un exemple de son héritage encore visible aujourd’hui.',
      },
    ],
  },
  {
    pack: 'cinema',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل يناسب سهرة عائلية هادئة أم جو تشويق وإثارة؟',
        tn: 'يمشي أكثر مع قعدة عائلية وإلا جو سسبانس وتشويق؟',
        en: 'Does it fit a cozy family night or high-tension suspense?',
        fr: 'Est-ce plutôt pour une soirée tranquille ou plein de suspense ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو كان إضاءة مشهد، هل هو ضوء شمس أم ظلال ليلية؟',
        tn: 'كان جا إضاءة متاع مشهد، ضو نهار وإلا ظلام وغموض؟',
        en: 'If it were scene lighting, bright daylight or neon shadows?',
        fr: 'En éclairage de scène : plein soleil ou ombres nocturnes ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'اذكر عنصراً صوتياً أو موسيقياً يرافق ظهوره.',
        tn: 'قول موسيقى وإلا صوت يمشي طول معاه.',
        en: 'Name a soundtrack mood or sound effect tied to it.',
        fr: 'Citez une ambiance sonore qui l’accompagne.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف القصة أو الدور دون قول كلمة ممثل أو مخرج أو فيلم.',
        tn: 'اوصف الجو من غير ما تقول ممثل، مخرج ولا فيلم.',
        en: 'Describe it without saying actor, director, or movie.',
        fr: 'Décrivez-le sans dire acteur, réalisateur ou film.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'أول رد فعل للجمهور: ضحك أم دهشة أم صمت؟',
        tn: 'أول ردة فعل متاع الناس: ضحك، صدمة وإلا سكات؟',
        en: 'Audience instant reaction: laugh, gasp, or silence?',
        fr: 'Réaction immédiate du public : rire, surprise ou silence ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'اذكر مشهداً افتتاحياً يختصر الفكرة في خمس ثوانٍ.',
        tn: 'احكي على لقطة في البداية تلخص الفكرة في 5 ثواني.',
        en: 'Pitch a 5-second opening shot that captures the vibe.',
        fr: 'Décrivez un plan d’ouverture de 5 secondes qui résume l’ambiance.',
      },
    ],
  },
  {
    pack: 'everyday_life',
    items: [
      {
        style: 'direct_question',
        difficulty: 'easy',
        ar: 'هل نحتاجه في الصباح الباكر أم في نهاية اليوم؟',
        tn: 'نستعملوه الصباح بكري وإلا في آخر النهار؟',
        en: 'Do we reach for this early in the morning or at day’s end?',
        fr: 'L’utilise-t-on plutôt tôt le matin ou en fin de journée ?',
      },
      {
        style: 'analogy',
        difficulty: 'easy',
        ar: 'لو نسيانك له يحدث ضجة، ما مقدار الإزعاج من 1 إلى 10؟',
        tn: 'كان تنساه في الدار، قداش يقلقك النهار من 1 لـ 10؟',
        en: 'If you forget it at home, how chaotic does your day get from 1 to 10?',
        fr: 'Si vous l’oubliez chez vous, à quel point est-ce gênant ?',
      },
      {
        style: 'association',
        difficulty: 'easy',
        ar: 'أين تضعه عادة في البيت أو المكتب؟',
        tn: 'وين تحطو بالعادة في الدار وإلا في الخدمة؟',
        en: 'Where does it usually sit in a house or bag?',
        fr: 'Où le range-t-on habituellement chez soi ?',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'صف العادة المرتبطة به دون ذكر الوقت أو المكان.',
        tn: 'اوصف العادة اللي معاه من غير ما تقول لا الوقت لا البلاصة.',
        en: 'Describe the daily habit around it without naming time or room.',
        fr: 'Décrivez l’habitude liée sans citer ni heure ni pièce.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'روتين مريح أم مهمة مستعجلة؟',
        tn: 'حاجة تفرّهد وإلا خدمة مزروبة؟',
        en: 'Relaxing ritual or urgent errand?',
        fr: 'Rituel apaisant ou course urgente ?',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'صف تفصيلة صغيرة تلاحظها فقط عند غيابه.',
        tn: 'قول تفصيلة صغيرة ما تفيق بيها كان كي يغيب.',
        en: 'Mention a tiny detail people only notice when it is missing.',
        fr: 'Citez un petit détail qu’on ne remarque qu’en son absence.',
      },
    ],
  },
  {
    pack: 'difficult_deduction',
    items: [
      {
        style: 'direct_question',
        difficulty: 'hard',
        ar: 'لو قارناه بكلمة ثانية قريبة منه جداً، أين يقع الفرق الحاسم؟',
        tn: 'كان نقارنوه بحاجة تشبهلو برشا، وين يجي الفرق الكبير؟',
        en: 'Compared to its closest lookalike, where does the decisive line sit?',
        fr: 'Face à son cousin le plus proche, où se situe la différence décisive ?',
      },
      {
        style: 'analogy',
        difficulty: 'hard',
        ar: 'مثِّله بقاعدة غير مكتوبة في التعامل بين الناس.',
        tn: 'شبهو بقاعدة خفية بين الناس في التعامل.',
        en: 'Use an unspoken social rule as an analogy for how it behaves.',
        fr: 'Comparez-le à une règle tacite dans les relations humaines.',
      },
      {
        style: 'association',
        difficulty: 'hard',
        ar: 'اذكر نقيضه غير المباشر لا نقيضه الواضح.',
        tn: 'قول عكسو الخفي موش عكسو الساهل.',
        en: 'Name its subtle opposite rather than its obvious antonym.',
        fr: 'Citez son opposé subtil plutôt que son contraire évident.',
      },
      {
        style: 'restricted_description',
        difficulty: 'hard',
        ar: 'أعطِ تلميحاً صادقاً يصلح له وحده ولا يصلح لبديل قريب.',
        tn: 'مدّ تلميح صحيح يجي معاه هو برك وما يركبش على البديل.',
        en: 'Give one clue true ONLY for your exact word and false for close decoys.',
        fr: 'Donnez un indice vrai uniquement pour votre mot exact.',
      },
      {
        style: 'quick_response',
        difficulty: 'hard',
        ar: 'مصنوع أم طبيعي أم مجرد فكرة؟ أجب فوراً.',
        tn: 'مصنوع، طبيعي وإلا فكرة مجردة؟ جاوب توة.',
        en: 'Man-made, natural, or pure concept — answer instantly.',
        fr: 'Artificiel, naturel ou concept pur — répondez vite.',
      },
      {
        style: 'contextual_example',
        difficulty: 'hard',
        ar: 'صف سيناريو يخطئ فيه المبتدئ ويصيب فيه الخبير حول هذا الموضوع.',
        tn: 'احكي على غلطة يعملها المبتدئ ويعرفها المحنك في الحاجة هذي.',
        en: 'Describe a nuance an amateur misses that an expert catches immediately.',
        fr: 'Donnez une nuance qu’un novice rate mais qu’un expert repère.',
      },
    ],
  },
];

export const QUESTION_LIBRARY: ChallengePrompt[] = PACK_SEEDS.flatMap((seed) =>
  seed.items.map((item, idx) => ({
    id: `${seed.pack}_${item.style}_${idx + 1}`,
    topicPack: seed.pack,
    style: item.style,
    difficulty: item.difficulty,
    prompts: {
      ar: item.ar,
      tn: item.tn,
      en: item.en,
      fr: item.fr,
    },
  }))
);
