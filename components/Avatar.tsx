import React, { useState, useEffect } from 'react';
import {
  User, Smile, Ghost, Cat, Dog, Bird, Fish,
  Gamepad2, Trophy, Star, Heart, Zap,
  Crown, Skull, Rocket, Plane, Car, Bike,
  Music, Camera, Video, Mic, Headphones,
  Coffee, Pizza, Beer, Cake, Gift,
  Sun, Moon, Cloud, Umbrella, Flame,
  Anchor, Compass, Map, Globe, Flag,
  Bug, Cpu, Feather, Flower, Gem, Glasses,
  Key, Leaf, Lightbulb, Palette, Puzzle, Shield,
  Snowflake, Sparkles, Swords, Tent, Trees, Wand
} from 'lucide-react';

export const AVATAR_ICONS: Record<string, React.ElementType> = {
  User, Smile, Ghost, Cat, Dog, Bird, Fish,
  Gamepad2, Trophy, Star, Heart, Zap,
  Crown, Skull, Rocket, Plane, Car, Bike,
  Music, Camera, Video, Mic, Headphones,
  Coffee, Pizza, Beer, Cake, Gift,
  Sun, Moon, Cloud, Umbrella, Flame,
  Anchor, Compass, Map, Globe, Flag,
  Bug, Cpu, Feather, Flower, Gem, Glasses,
  Key, Leaf, Lightbulb, Palette, Puzzle, Shield,
  Snowflake, Sparkles, Swords, Tent, Trees, Wand
};

interface AvatarProps {
  avatar?: string;
  name?: string;
  size?: number;
  className?: string;
  frameUrl?: string;
  showName?: boolean;
  badge?: React.ReactNode;
  badgePosition?: 'bottom-right' | 'bottom-center';
  status?: 'ready' | 'waiting' | 'none';
}

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  name,
  size = 64,
  className = '',
  frameUrl,
  showName = false,
  badge,
  badgePosition = 'bottom-right',
  status = 'none'
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const isImageUrl = Boolean(
    avatar &&
      !imgError &&
      (avatar.startsWith('data:') ||
        avatar.startsWith('http') ||
        avatar.startsWith('/') ||
        avatar.startsWith('blob:') ||
        avatar.includes('.webp') ||
        avatar.includes('.png'))
  );

  const renderAvatar = () => {
    if (isImageUrl && avatar) {
      return (
        <img
          src={avatar}
          alt={name || 'avatar'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full rounded-full ${
            avatar === '/assets/roles/wizard.png' ? 'object-contain bg-slate-800/80 p-1' : 'object-cover'
          }`}
        />
      );
    }

    if (name) {
      const firstLetter = name.trim().charAt(0).toUpperCase();
      const colors = [
        'bg-orange-500', 'bg-blue-500', 'bg-emerald-600', 'bg-purple-500',
        'bg-pink-500', 'bg-amber-600', 'bg-indigo-500', 'bg-rose-500'
      ];
      const colorIndex = name.length % colors.length;
      const bgColor = colors[colorIndex];

      return (
        <div className={`w-full h-full flex items-center justify-center rounded-full ${bgColor} text-white font-black shadow-inner`}>
          <span style={{ fontSize: size * 0.48 }}>{firstLetter || '?'}</span>
        </div>
      );
    }

    if (avatar && avatar.startsWith('icon:')) {
      const iconName = avatar.split(':')[1];
      const IconComponent = AVATAR_ICONS[iconName] || User;
      return (
        <div className="w-full h-full flex items-center justify-center rounded-full bg-bg-dark border border-white/10">
          <IconComponent size={size * 0.6} className="text-text-muted" />
        </div>
      );
    }

    if (avatar && avatar.length <= 4) {
      return (
        <div className="w-full h-full flex items-center justify-center rounded-full bg-bg-surface border border-border shadow-inner">
          <span style={{ fontSize: size * 0.55 }}>{avatar}</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center rounded-full bg-bg-dark border border-white/10">
        <User size={size * 0.6} className="text-text-muted" />
      </div>
    );
  };

  const borderThickness = size < 40 ? 'border-2' : size < 80 ? 'border-[3px]' : 'border-4';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <div
          className={`relative rounded-full ${frameUrl ? 'border-0' : `${borderThickness} border-white/80`} shadow-lg overflow-hidden ${className}`}
          style={{ width: size, height: size }}
        >
          {renderAvatar()}

          {status !== 'none' && (
            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-white text-xs font-black tracking-wider">
                {status === 'waiting' ? '...' : ''}
              </span>
            </div>
          )}
        </div>

        {frameUrl && (
          <img
            src={frameUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[12%] w-[124%] h-[124%] object-contain z-10 select-none"
          />
        )}

        {badge && (
          <div className={`absolute z-20 ${badgePosition === 'bottom-center' ? '-bottom-3 left-1/2 -translate-x-1/2' : '-bottom-1 -right-1'}`}>
            {badge}
          </div>
        )}
      </div>

      {showName && name && (
        <div className={`bg-white px-3.5 py-1 rounded-lg shadow-md border border-slate-200 min-w-[76px] text-center ${badgePosition === 'bottom-center' && badge ? 'mt-5' : ''}`}>
          <span className="text-slate-900 font-black text-xs sm:text-sm truncate block max-w-[100px]">
            {name}
          </span>
        </div>
      )}
    </div>
  );
};
