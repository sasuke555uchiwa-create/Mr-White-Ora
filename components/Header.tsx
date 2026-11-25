import React from 'react';
import { Home } from 'lucide-react';
import { getSettings } from '../services/storageService';
import { getUITranslation } from '../translations';
import { IconButton } from './ui/BlacksiteUI';

interface HeaderProps {
  onHome: () => void;
  showHome: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onHome, showHome }) => {
  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);

  return (
    <header
      className="relative w-full z-20 shrink-0 border-b border-border-strong bg-bg-surface/95 shadow-[inset_0_1px_0_var(--surface-highlight)]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 bottom-0 pointer-events-none" />
      <div className="w-full max-w-5xl mx-auto py-2.5 px-4 sm:px-6 flex items-center justify-between gap-3">
        {showHome ? (
          <IconButton
            onClick={onHome}
            title={t('backToHome')}
            aria-label={t('backToHome')}
            variant="secondary"
          >
            <Home size={19} className="text-primary-text" />
          </IconButton>
        ) : (
          <div className="w-11 shrink-0" />
        )}

        <div className="text-center min-w-0 px-2 flex-1">
          {showHome && (
            <div className="inline-flex items-center justify-center gap-2 max-w-full">
              <h1
                className={`text-sm sm:text-base font-extrabold text-text-main leading-tight truncate ${
                  isRTL ? 'font-cairo' : 'font-sans tracking-wider'
                }`}
              >
                {isRTL ? 'المتخفي · BLACKSITE' : 'MR. WHITE · BLACKSITE'}
              </h1>
            </div>
          )}
        </div>

        <div className="w-11 shrink-0" />
      </div>
    </header>
  );
};
