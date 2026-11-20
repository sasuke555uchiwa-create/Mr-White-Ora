import React from 'react';
import {
  ArrowRight,
  Users,
  Eye,
  MessageCircle,
  Vote,
  Trophy,
  Star,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { SPECIAL_ROLES } from '../data/specialRoles';

interface RulesScreenProps {
  onBack: () => void;
}

export const RulesScreen: React.FC<RulesScreenProps> = ({ onBack }) => {
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  const isAr = lang === 'ar';

  const steps = [
    {
      icon: <Users className="w-6 h-6 text-sky-400" />,
      title: isAr ? '1. الأدوار الرئيسية الثلاثة' : t('rule1Title'),
      description: isAr
        ? 'المدنيون يحصلون على الكلمة السرية الصحيحة، المتخفي (Undercover) يحصل على كلمة مشابهة قليلاً، أما Mr. White فلا يحصل على أي كلمة ويجب أن يتظاهر بمعرفتها دون أن يبدأ الوصف أولاً في الجولة الأولى.'
        : t('rule1Desc'),
    },
    {
      icon: <Eye className="w-6 h-6 text-emerald-400" />,
      title: isAr ? '2. مرحلة الوصف أو الأسئلة' : t('rule2Title'),
      description: isAr
        ? 'كل لاعب يصف كلمته بتلميح ذكي وقصير: واضح كفاية ليطمئن لك المدنيون، وغامض كفاية حتى لا يكتشف Mr. White الكلمة السرية.'
        : t('rule2Desc'),
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-amber-400" />,
      title: t('rule3Title'),
      description: t('rule3Desc'),
    },
    {
      icon: <Vote className="w-6 h-6 text-rose-400" />,
      title: isAr ? '4. التصويت وفرصة Mr. White' : t('rule4Title'),
      description: isAr
        ? 'بعد النقاش يتم التصويت لإقصاء المشتبه به. إذا أُقصي Mr. White يحصل على فرصة أخيرة لكتابة الكلمة السرية الصحيحة؛ إن أصاب خطف الفوز للدخلاء!'
        : t('rule4Desc'),
    },
    {
      icon: <Trophy className="w-6 h-6 text-purple-400" />,
      title: isAr ? '5. شروط الفوز الرسمية' : t('rule5Title'),
      description: isAr
        ? 'يفوز المدنيون عند إقصاء جميع المتخفين وMr. White. ويفوز الدخلاء إذا خمّن Mr. White الكلمة أو بقي مدني واحد فقط (أو تساوى عدد الدخلاء مع المدنيين). الأدوار الخاصة هي قدرات إضافية فوق دورك الأساسي ولا تفوز بمفردها أبداً!'
        : 'Civilians win when all Undercovers and Mr. Whites are eliminated. Infiltrators win when Mr. White guesses the word or outnumbers/reaches 1 Civilian. Special Roles are bonus powers layered onto your main role and never win solo!',
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-400" />,
      title: isAr ? '6. نظام النقاط الرسمي' : t('rule6Title'),
      description: isAr
        ? 'عند فوز المدنيين: +2 نقطة لكل مدني. عند فوز المتخفي وحده أو مع غير المقصى: +10 نقاط للمتخفي الباقي دون نقاط للمقصى. عند فوز Mr. White: +6 نقاط إذا خمّن الكلمة عند إقصائه (وحده دون المتخفي)، و+12 نقطة (الضعف) إذا فاز وحده أو مع المتخفين دون الحاجة لتخمين الكلمة! ويكسب Mr. Joy +4 نقاط عند إقصائه أولاً.'
        : 'Civilians win: +2 pts each. Surviving Undercover win: +10 pts (eliminated Mr. White gets 0). Mr. White wins: +6 pts solo if guessing the word upon elimination, or +12 pts (double!) if winning without guessing (solo or alongside surviving Undercovers). Mr. Joy earns +4 bonus pts for first exit.',
    },
    {
      icon: <Gamepad2 className="w-6 h-6 text-blue-400" />,
      title: t('rule7Title'),
      description: t('rule7Desc'),
    },
  ];

  return (
    <div className="w-full min-h-full flex flex-col p-5 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-text-main drop-shadow-sm">
          {t('gameRules')}
        </h2>
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5 ltr:rotate-180" />
        </button>
      </div>

      <div className="space-y-4 pb-28">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card-modern p-4 flex items-start gap-4"
          >
            <div className="p-3 rounded-xl bg-bg-dark/80 border border-border shrink-0 shadow-inner">
              {step.icon}
            </div>
            <div>
              <h3 className="font-black text-text-main mb-1 text-base">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed font-bold">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Special Roles Guide Section */}
        <div className="pt-4">
          <div className="mb-3">
            <h3 className="text-lg font-black text-text-main flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              <span>{t('specialRoles')}</span>
            </h3>
            <p className="text-xs font-bold text-text-muted mt-0.5">
              {isAr
                ? 'تُمنح الأدوار الخاصة كقدرات إضافية فوق دورك الرئيسي (مدني / متخفٍّ / Mr. White) ولا تمنح فوزاً منفرداً.'
                : 'Special roles are bonus abilities layered onto your main role and never grant a solo victory.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_ROLES.map((role) => (
              <div key={role.id} className="card-modern p-3.5 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#0B1120] border border-white/15 shadow-sm shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={role.image}
                    alt={role.names[lang] || role.names.en}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm" style={{ color: role.accentColor }}>
                    {role.names[lang] || role.names.en}
                  </h4>
                  <p className="text-xs font-bold text-text-muted leading-snug mt-0.5">
                    {role.descriptions[lang] || role.descriptions.en}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-dark via-bg-dark/95 to-transparent pointer-events-none flex justify-center z-30">
        <button
          onClick={onBack}
          className="w-full max-w-sm py-3.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg font-black shadow-[0_5px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all pointer-events-auto"
        >
          {t('gotItPlay')}
        </button>
      </div>
    </div>
  );
};
