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
      className="w-full max-w-4xl mx-auto py-2.5 flex items-center justify-between z-20 px-4 shrink-0 border-b border-border/50 bg-bg-surface/65 backdrop-blur-xs"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
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
        <div className="w-11" />
      )}

      <div className="text-center min-w-0 px-2">
        {showHome && (
          <div className="flex flex-col items-center">
            <h1
              className={`text-base sm:text-lg font-extrabold text-text-main leading-tight ${
                isRTL ? 'font-cairo' : 'font-sans tracking-wider'
              }`}
            >
              {isRTL ? 'المتخفي · BLACKSITE' : 'MR. WHITE · BLACKSITE'}
            </h1>
          </div>
        )}
      </div>

      <div className="w-11" />
    </header>
  );
};
