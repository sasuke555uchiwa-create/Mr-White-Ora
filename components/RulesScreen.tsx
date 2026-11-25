import React from 'react';
import {
  Users,
  Eye,
  MessageCircle,
  Vote,
  Trophy,
  Star,
  Gamepad2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { SPECIAL_ROLES } from '../data/specialRoles';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  BottomActionBar,
  ClassifiedStamp,
  DossierHeaderBand,
  IconButton,
  IntelligencePanel,
  SectionDivider,
  TacticalButton,
} from './ui/BlacksiteUI';

interface RulesScreenProps {
  onBack: () => void;
}

export const RulesScreen: React.FC<RulesScreenProps> = ({ onBack }) => {
  const settings = getSettings();
  const lang = settings.language;
  const isAr = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);

  const steps = [
    {
      icon: <Users className="w-5 h-5 text-cyan-text" />,
      title: isAr ? '1. الأدوار الرئيسية الثلاثة' : t('rule1Title'),
      description: isAr
        ? 'المدنيون يحصلون على الكلمة السرية الصحيحة، المتخفي (Undercover) يحصل على كلمة مشابهة قليلاً، أما Mr. White فلا يحصل على أي كلمة ويجب أن يتظاهر بمعرفتها دون أن يبدأ الوصف أولاً في الجولة الأولى.'
        : t('rule1Desc'),
    },
    {
      icon: <Eye className="w-5 h-5 text-emerald-text" />,
      title: isAr ? '2. مرحلة الوصف أو الأسئلة' : t('rule2Title'),
      description: isAr
        ? 'كل لاعب يصف كلمته بتلميح ذكي وقصير: واضح كفاية ليطمئن لك المدنيون، وغامض كفاية حتى لا يكتشف Mr. White الكلمة السرية.'
        : t('rule2Desc'),
    },
    {
      icon: <MessageCircle className="w-5 h-5 text-primary-text" />,
      title: t('rule3Title'),
      description: t('rule3Desc'),
    },
    {
      icon: <Vote className="w-5 h-5 text-danger-text" />,
      title: isAr ? '4. التصويت وفرصة Mr. White' : t('rule4Title'),
      description: isAr
        ? 'بعد النقاش يتم التصويت لإقصاء المشتبه به. إذا أُقصي Mr. White يحصل على فرصة أخيرة لكتابة الكلمة السرية الصحيحة؛ إن أصاب خطف الفوز للدخلاء!'
        : t('rule4Desc'),
    },
    {
      icon: <Trophy className="w-5 h-5 text-primary-text" />,
      title: isAr ? '5. شروط الفوز الرسمية' : t('rule5Title'),
      description: isAr
        ? 'يفوز المدنيون عند إقصاء جميع المتخفين وMr. White. ويفوز الدخلاء إذا خمّن Mr. White الكلمة أو بقي مدني واحد فقط (أو تساوى عدد الدخلاء مع المدنيين). الأدوار الخاصة هي قدرات إضافية فوق دورك الأساسي ولا تفوز بمفردها أبداً!'
        : 'Civilians win when all Undercovers and Mr. Whites are eliminated. Infiltrators win when Mr. White guesses the word or outnumbers/reaches 1 Civilian. Special Roles are bonus powers layered onto your main role and never win solo!',
    },
    {
      icon: <Star className="w-5 h-5 text-primary-text" />,
      title: isAr ? '6. نظام النقاط الرسمي' : t('rule6Title'),
      description: isAr
        ? 'عند فوز المدنيين: +2 نقطة لكل مدني. عند فوز المتخفي وحده أو مع غير المقصى: +10 نقاط للمتخفي الباقي دون نقاط للمقصى. عند فوز Mr. White: +6 نقاط إذا خمّن الكلمة عند إقصائه (وحده دون المتخفي)، و+12 نقطة (الضعف) إذا فاز وحده أو مع المتخفين دون الحاجة لتخمين الكلمة! ويكسب Mr. Joy +4 نقاط عند إقصائه أولاً.'
        : 'Civilians win: +2 pts each. Surviving Undercover win: +10 pts (eliminated Mr. White gets 0). Mr. White wins: +6 pts solo if guessing the word upon elimination, or +12 pts (double!) if winning without guessing (solo or alongside surviving Undercovers). Mr. Joy earns +4 bonus pts for first exit.',
    },
    {
      icon: <Gamepad2 className="w-5 h-5 text-cyan-text" />,
      title: t('rule7Title'),
      description: t('rule7Desc'),
    },
  ];

  return (
    <div className="relative w-full min-h-full flex flex-col px-4 sm:px-6 pt-4 pb-0 max-w-3xl mx-auto">
      <BlacksiteScreenBackdrop bgKey="archive" texture="paper" />
      <div className="relative z-10 flex flex-col flex-1 w-full">
      <DossierHeaderBand
        accent="cyan"
        texture="paper"
        className="mb-5"
        badge={<ClassifiedStamp tone="cyan">FIELD MANUAL</ClassifiedStamp>}
        title={t('gameRules')}
        icon={<BlacksiteIcon name="help" size={20} />}
        action={
          <IconButton onClick={onBack} aria-label={t('back')} variant="secondary">
            <BlacksiteIcon name="backNav" size={18} rtlFlip />
          </IconButton>
        }
      />

      <div className="space-y-3 pb-6">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <IntelligencePanel className="relative overflow-hidden p-4 flex items-start gap-3.5">
              <div aria-hidden="true" className="blacksite-hairline-cyan absolute inset-x-0 top-0 pointer-events-none" />
              <div className="p-2.5 rounded-[10px] bg-bg-card border border-border shrink-0">
                {step.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-text-main mb-1 text-sm sm:text-base">{step.title}</h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </IntelligencePanel>
          </motion.div>
        ))}

        {/* Special Roles Guide Section */}
        <div className="pt-4">
          <SectionDivider label={t('specialRoles')} className="mb-4" />
          <div className="mb-3">
            <h3 className="text-base sm:text-lg font-extrabold text-text-main flex items-center gap-2">
              <BlacksiteIcon name="specialAbility" size={18} />
              <span>{t('specialRoles')}</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {isAr
                ? 'تُمنح الأدوار الخاصة كقدرات إضافية فوق دورك الرئيسي (مدني / متخفٍّ / Mr. White) ولا تمنح فوزاً منفرداً.'
                : 'Special roles are bonus abilities layered onto your main role and never grant a solo victory.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_ROLES.map((role) => (
              <IntelligencePanel key={role.id} className="p-3.5 flex items-center gap-3">
                <div className="w-13 h-13 rounded-[10px] bg-[#080B10] border border-border-strong shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={role.image}
                    alt={role.names[lang] || role.names.en}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm" style={{ color: role.accentColor }}>
                    {role.names[lang] || role.names.en}
                  </h4>
                  <p className="text-xs text-text-muted leading-snug mt-0.5">
                    {role.descriptions[lang] || role.descriptions.en}
                  </p>
                </div>
              </IntelligencePanel>
            ))}
          </div>
        </div>
      </div>

      <BottomActionBar className="mt-auto">
        <div className="w-full max-w-sm mx-auto">
          <TacticalButton variant="primary" size="lg" fullWidth onClick={onBack}>
            {t('gotItPlay')}
          </TacticalButton>
        </div>
      </BottomActionBar>
      </div>
    </div>
  );
};
