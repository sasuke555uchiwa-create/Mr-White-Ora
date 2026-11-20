import React from 'react';
import { getSettings } from '../services/storageService';
import { getUITranslation } from '../translations';

interface HeaderProps {
  onHome: () => void;
  showHome: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onHome, showHome }) => {
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  return (
    <header
      className="w-full max-w-2xl mx-auto py-3 flex items-center justify-between z-10 px-4 shrink-0"
      dir={['ar', 'sa'].includes(lang) ? 'rtl' : 'ltr'}
    >
      {showHome ? (
        <button
          onClick={onHome}
          title={t('backToHome')}
          className="w-11 h-11 bg-bg-surface/85 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border-strong shadow-md hover:border-sky-400/60 active:scale-95 transition-all p-2"
        >
          <img
            src="/assets/ui/home.png"
            alt="Home"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </button>
      ) : (
        <div className="w-11" />
      )}

      <div className="text-center">
        {showHome && (
          <h1
            className={`text-xl sm:text-2xl font-black text-text-main tracking-wide ${
              lang === 'ar' ? 'font-cairo' : 'font-sans'
            } drop-shadow-sm`}
          >
            {lang === 'ar' ? 'المتخفي · Undercover' : 'UNDERCOVER'}
          </h1>
        )}
      </div>

      <div className="w-11" />
    </header>
  );
};
