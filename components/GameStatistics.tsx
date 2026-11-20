import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Crown,
  Flame,
  RotateCcw,
  Shield,
  Target,
  TrendingUp,
} from 'lucide-react';
import { UserProfile } from '../contexts/AuthContext';
import { getRoleAsset, getRoleTitle } from '../data/specialRoles';
import { clearLocalSessionStats, getSessionStats } from '../services/storageService';
import {
  computeGameStatistics,
  StatisticsFilter,
} from '../src/game/statsEngine';
import { PlayerRole } from '../types';

interface GameStatisticsProps {
  profile: UserProfile;
  userId: string;
  lang: string;
}

interface RoleImageWithFallbackProps {
  role: PlayerRole;
  alt: string;
  sizeClass?: string;
}

const RoleArtwork: React.FC<RoleImageWithFallbackProps> = ({
  role,
  alt,
  sizeClass = 'w-12 h-12',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0`}
        aria-label={alt}
      >
        <Shield className="w-6 h-6" />
      </div>
    );
  }

  return (
    <img
      src={getRoleAsset(role)}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-2xl object-cover bg-[#0B1120] border border-white/15 shrink-0`}
    />
  );
};

interface CopyPack {
  sectionTitle: string;
  filterAll: string;
  filterOnline: string;
  filterLocal: string;
  allPlayers: string;
  winLossRatio: string;
  winRate: string;
  winsLabel: string;
  lossesLabel: string;
  gamesPlayed: string;
  hostedGames: string;
  localMatches: string;
  longestStreak: string;
  currentStreak: string;
  favoriteRoleTitle: string;
  roleBreakdownTitle: string;
  noGamesYetTitle: string;
  noGamesYetDesc: string;
  gamesCount: (n: number) => string;
  winShort: string;
  lossShort: string;
  resetLocal: string;
  confirmReset: string;
  cancel: string;
  syncScopeNote: string;
}

const COPY_BY_LANG: Record<string, CopyPack> = {
  ar: {
    sectionTitle: 'إحصائيات اللعب والأدوار',
    filterAll: 'الكل',
    filterOnline: 'أونلاين',
    filterLocal: 'لعب محلي',
    allPlayers: 'جميع اللاعبين',
    winLossRatio: 'نسبة الفوز للخسارة',
    winRate: 'معدل الفوز',
    winsLabel: 'انتصار',
    lossesLabel: 'خسارة',
    gamesPlayed: 'المباريات',
    hostedGames: 'غرف مستضافة',
    localMatches: 'جلسات محلية',
    longestStreak: 'أطول سلسلة فوز',
    currentStreak: 'السلسلة الحالية',
    favoriteRoleTitle: 'الدور المفضل عبر الجلسات',
    roleBreakdownTitle: 'الأداء حسب الدور',
    noGamesYetTitle: 'لا توجد مباريات مسجلة بعد',
    noGamesYetDesc: 'أكمل جولة واحدة لتظهر نسبة الفوز للخسارة وأدوارك المفضلة هنا.',
    gamesCount: (n) => `${n} جولة`,
    winShort: 'ف',
    lossShort: 'خ',
    resetLocal: 'مسح المحلي',
    confirmReset: 'تأكيد المسح',
    cancel: 'إلغاء',
    syncScopeNote: 'تتم مزامنة إحصائيات الأونلاين سحابياً عبر أجهزتك، بينما يُحفظ اللعب المحلي على هذا المتصفح فقط.',
  },
  en: {
    sectionTitle: 'Game Statistics & Roles',
    filterAll: 'All Sessions',
    filterOnline: 'Online',
    filterLocal: 'Pass & Play',
    allPlayers: 'All Players',
    winLossRatio: 'Win / Loss Ratio',
    winRate: 'Win Rate',
    winsLabel: 'Wins',
    lossesLabel: 'Losses',
    gamesPlayed: 'Games Played',
    hostedGames: 'Hosted Games',
    localMatches: 'Local Sessions',
    longestStreak: 'Best Win Streak',
    currentStreak: 'Current Streak',
    favoriteRoleTitle: 'Favorite Role Across Sessions',
    roleBreakdownTitle: 'Role Breakdown',
    noGamesYetTitle: 'No matches recorded yet',
    noGamesYetDesc: 'Complete a match to track your win/loss ratio and favorite roles.',
    gamesCount: (n) => `${n} ${n === 1 ? 'game' : 'games'}`,
    winShort: 'W',
    lossShort: 'L',
    resetLocal: 'Reset Local',
    confirmReset: 'Confirm Reset',
    cancel: 'Cancel',
    syncScopeNote: 'Online stats sync via cloud across devices; Pass & Play stats are saved on this browser.',
  },
  fr: {
    sectionTitle: 'Statistiques & Rôles',
    filterAll: 'Toutes',
    filterOnline: 'En ligne',
    filterLocal: 'Local',
    allPlayers: 'Tous les joueurs',
    winLossRatio: 'Ratio V / D',
    winRate: 'Taux de victoire',
    winsLabel: 'Victoires',
    lossesLabel: 'Défaites',
    gamesPlayed: 'Parties jouées',
    hostedGames: 'Parties créées',
    localMatches: 'Sessions locales',
    longestStreak: 'Meilleure série',
    currentStreak: 'Série actuelle',
    favoriteRoleTitle: 'Rôle favori',
    roleBreakdownTitle: 'Performance par rôle',
    noGamesYetTitle: 'Aucune partie enregistrée',
    noGamesYetDesc: 'Terminez une partie pour suivre votre ratio V/D et vos rôles favoris.',
    gamesCount: (n) => `${n} ${n === 1 ? 'partie' : 'parties'}`,
    winShort: 'V',
    lossShort: 'D',
    resetLocal: 'Réinitialiser local',
    confirmReset: 'Confirmer',
    cancel: 'Annuler',
    syncScopeNote: 'Les stats en ligne sont synchronisées dans le cloud ; le mode local reste sur ce navigateur.',
  },
  es: {
    sectionTitle: 'Estadísticas y Roles',
    filterAll: 'Todas',
    filterOnline: 'En línea',
    filterLocal: 'Local',
    allPlayers: 'Todos',
    winLossRatio: 'Ratio V / D',
    winRate: 'Tasa de victoria',
    winsLabel: 'Victorias',
    lossesLabel: 'Derrotas',
    gamesPlayed: 'Partidas',
    hostedGames: 'Anfitrión',
    localMatches: 'Sesiones locales',
    longestStreak: 'Mejor racha',
    currentStreak: 'Racha actual',
    favoriteRoleTitle: 'Rol favorito',
    roleBreakdownTitle: 'Rendimiento por rol',
    noGamesYetTitle: 'Aún no hay partidas',
    noGamesYetDesc: 'Completa una partida para ver tu ratio V/D y roles favoritos.',
    gamesCount: (n) => `${n} ${n === 1 ? 'partida' : 'partidas'}`,
    winShort: 'V',
    lossShort: 'D',
    resetLocal: 'Borrar local',
    confirmReset: 'Confirmar',
    cancel: 'Cancelar',
    syncScopeNote: 'Las estadísticas en línea se sincronizan en la nube; el modo local se guarda en este navegador.',
  },
  de: {
    sectionTitle: 'Spielstatistiken & Rollen',
    filterAll: 'Alle',
    filterOnline: 'Online',
    filterLocal: 'Lokal',
    allPlayers: 'Alle Spieler',
    winLossRatio: 'Sieg / Niederlage',
    winRate: 'Siegrate',
    winsLabel: 'Siege',
    lossesLabel: 'Niederlagen',
    gamesPlayed: 'Spiele',
    hostedGames: 'Gehostet',
    localMatches: 'Lokale Runden',
    longestStreak: 'Längste Serie',
    currentStreak: 'Aktuelle Serie',
    favoriteRoleTitle: 'Lieblingsrolle',
    roleBreakdownTitle: 'Rollenübersicht',
    noGamesYetTitle: 'Noch keine Spiele erfasst',
    noGamesYetDesc: 'Beende eine Runde, um Siegrate und Lieblingsrollen zu sehen.',
    gamesCount: (n) => `${n} ${n === 1 ? 'Spiel' : 'Spiele'}`,
    winShort: 'S',
    lossShort: 'N',
    resetLocal: 'Lokal löschen',
    confirmReset: 'Bestätigen',
    cancel: 'Abbrechen',
    syncScopeNote: 'Online-Statistiken werden in der Cloud synchronisiert; lokale Runden bleiben in diesem Browser.',
  },
  tr: {
    sectionTitle: 'Oyun İstatistikleri ve Roller',
    filterAll: 'Tümü',
    filterOnline: 'Çevrimiçi',
    filterLocal: 'Yerel',
    allPlayers: 'Tüm Oyuncular',
    winLossRatio: 'Kazanma / Kaybetme',
    winRate: 'Kazanma Oranı',
    winsLabel: 'Galibiyet',
    lossesLabel: 'Mağlubiyet',
    gamesPlayed: 'Oynanan',
    hostedGames: 'Kurulan Oda',
    localMatches: 'Yerel Oturum',
    longestStreak: 'En Uzun Seri',
    currentStreak: 'Mevcut Seri',
    favoriteRoleTitle: 'Favori Rol',
    roleBreakdownTitle: 'Rol Performansı',
    noGamesYetTitle: 'Henüz kayıtlı maç yok',
    noGamesYetDesc: 'Oranlarını ve favori rollerini görmek için bir maç tamamla.',
    gamesCount: (n) => `${n} oyun`,
    winShort: 'G',
    lossShort: 'M',
    resetLocal: 'Yereli Sıfırla',
    confirmReset: 'Onayla',
    cancel: 'İptal',
    syncScopeNote: 'Çevrimiçi istatistikler bulutta eşitlenir; yerel oyun verileri yalnızca bu tarayıcıda saklanır.',
  },
  pt: {
    sectionTitle: 'Estatísticas e Papéis',
    filterAll: 'Todas',
    filterOnline: 'Online',
    filterLocal: 'Local',
    allPlayers: 'Todos',
    winLossRatio: 'Taxa V / D',
    winRate: 'Taxa de Vitória',
    winsLabel: 'Vitórias',
    lossesLabel: 'Derrotas',
    gamesPlayed: 'Partidas',
    hostedGames: 'Hospedadas',
    localMatches: 'Sessões Locais',
    longestStreak: 'Melhor Sequência',
    currentStreak: 'Sequência Atual',
    favoriteRoleTitle: 'Papel Favorito',
    roleBreakdownTitle: 'Desempenho por Papel',
    noGamesYetTitle: 'Nenhuma partida registrada',
    noGamesYetDesc: 'Conclua uma partida para ver sua taxa V/D e papéis favoritos.',
    gamesCount: (n) => `${n} ${n === 1 ? 'jogo' : 'jogos'}`,
    winShort: 'V',
    lossShort: 'D',
    resetLocal: 'Limpar Local',
    confirmReset: 'Confirmar',
    cancel: 'Cancelar',
    syncScopeNote: 'Estatísticas online sincronizam na nuvem; partidas locais ficam salvas apenas neste navegador.',
  },
};

export const GameStatistics: React.FC<GameStatisticsProps> = ({
  profile,
  userId,
  lang,
}) => {
  const normalizedLang = lang === 'sa' ? 'ar' : COPY_BY_LANG[lang] ? lang : 'en';
  const copy = COPY_BY_LANG[normalizedLang];
  const isRTL = normalizedLang === 'ar';

  const [filter, setFilter] = useState<StatisticsFilter>('all');
  const [localPlayerFilter, setLocalPlayerFilter] = useState<string>('__all__');
  const [confirmReset, setConfirmReset] = useState(false);
  const [sessionSnapshot, setSessionSnapshot] = useState(() => getSessionStats(userId));

  useEffect(() => {
    setSessionSnapshot(getSessionStats(userId));
  }, [userId, profile.stats?.played]);

  const localPlayerNames = useMemo(
    () =>
      Object.values(sessionSnapshot.offlinePlayers)
        .sort((a, b) => b.played - a.played)
        .map((p) => p.name),
    [sessionSnapshot.offlinePlayers]
  );

  const computed = useMemo(
    () =>
      computeGameStatistics({
        filter,
        serverStats: profile.stats,
        sessionStats: sessionSnapshot,
        localPlayerFilter,
      }),
    [filter, profile.stats, sessionSnapshot, localPlayerFilter]
  );

  const handleConfirmResetLocal = () => {
    const next = clearLocalSessionStats(userId);
    setSessionSnapshot(next);
    setLocalPlayerFilter('__all__');
    setConfirmReset(false);
  };

  const hasLocalData =
    sessionSnapshot.offlineMatchesCount > 0 || localPlayerNames.length > 0;

  return (
    <section
      className="w-full mb-8"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={copy.sectionTitle}
    >
      {/* Header Row & Scope Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary shrink-0" />
            <h3 className="text-lg font-black text-text-main">{copy.sectionTitle}</h3>
          </div>
          <p className="text-[11px] font-bold text-text-muted mt-1 text-start">
            {copy.syncScopeNote}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-bg-surface border border-border self-start sm:self-auto"
          role="tablist"
          aria-label={copy.sectionTitle}
        >
          {(['all', 'online', 'local'] as StatisticsFilter[]).map((tab) => {
            const label =
              tab === 'all'
                ? copy.filterAll
                : tab === 'online'
                ? copy.filterOnline
                : copy.filterLocal;
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Local Pass & Play Player Filter */}
      {filter === 'local' && localPlayerNames.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 custom-scrollbar">
          <button
            type="button"
            onClick={() => setLocalPlayerFilter('__all__')}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
              localPlayerFilter === '__all__'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
            }`}
          >
            {copy.allPlayers}
          </button>
          {localPlayerNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setLocalPlayerFilter(name)}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border transition-colors ${
                localPlayerFilter === name
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg-surface border-border text-text-muted hover:text-text-main'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="card-modern p-4 flex flex-col justify-between text-start">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-text-muted">{copy.winLossRatio}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-text-main tabular-nums">
            {computed.winLossRatioLabel}
          </div>
          <div className="text-xs font-bold text-text-muted mt-1 tabular-nums">
            {computed.wins} {copy.winShort} · {computed.losses} {copy.lossShort}
          </div>
        </div>

        <div className="card-modern p-4 flex flex-col justify-between text-start">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-text-muted">{copy.winRate}</span>
            <Target className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-blue-400 tabular-nums">
            {computed.winRate}%
          </div>
          <div className="text-xs font-bold text-text-muted mt-1 tabular-nums">
            {computed.played} {copy.gamesPlayed}
          </div>
        </div>

        <div className="card-modern p-4 flex flex-col justify-between text-start">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-text-muted">{copy.longestStreak}</span>
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-amber-400 tabular-nums">
            {computed.longestStreak}
          </div>
          <div className="text-xs font-bold text-text-muted mt-1 tabular-nums">
            {copy.currentStreak}: {computed.currentStreak}
          </div>
        </div>

        <div className="card-modern p-4 flex flex-col justify-between text-start">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-text-muted">
              {filter === 'local' ? copy.localMatches : copy.hostedGames}
            </span>
            <Crown className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="text-2xl font-black text-purple-400 tabular-nums">
            {computed.hosted}
          </div>
          <div className="text-xs font-bold text-text-muted mt-1 tabular-nums">
            {copy.gamesCount(computed.played)}
          </div>
        </div>
      </div>

      {/* Win vs Loss Balance & Favorite Roles Panel */}
      <div className="card-modern p-5 space-y-5">
        {/* Win / Loss Split Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-2 tabular-nums">
            <span className="text-emerald-400">
              {computed.wins} {copy.winsLabel}
            </span>
            <span className="text-rose-400">
              {computed.losses} {copy.lossesLabel}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-bg-dark overflow-hidden flex border border-white/5">
            {computed.played > 0 ? (
              <>
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${computed.winSharePercent}%` }}
                />
                <div
                  className="h-full bg-rose-500/80 transition-all duration-300"
                  style={{ width: `${100 - computed.winSharePercent}%` }}
                />
              </>
            ) : (
              <div className="h-full w-full bg-white/10" />
            )}
          </div>
        </div>

        {/* Favorite Role Spotlight + Role Breakdown */}
        {computed.roles.length === 0 ? (
          <div className="pt-4 border-t border-white/10 text-center py-4">
            <Award className="w-8 h-8 text-text-muted/60 mx-auto mb-2" />
            <p className="text-sm font-black text-text-main">{copy.noGamesYetTitle}</p>
            <p className="text-xs font-bold text-text-muted mt-1">{copy.noGamesYetDesc}</p>
          </div>
        ) : (
          <>
            {computed.favoriteRole && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-bold text-text-muted mb-3">
                  {copy.favoriteRoleTitle}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <RoleArtwork
                      role={computed.favoriteRole.role}
                      alt={getRoleTitle(computed.favoriteRole.role, normalizedLang)}
                      sizeClass="w-14 h-14"
                    />
                    <div className="min-w-0 text-start">
                      <h4 className="text-base sm:text-lg font-black text-text-main truncate">
                        {getRoleTitle(computed.favoriteRole.role, normalizedLang)}
                      </h4>
                      <div className="text-xs font-bold text-text-muted flex items-center gap-1.5 flex-wrap tabular-nums mt-0.5">
                        <span>{copy.gamesCount(computed.favoriteRole.played)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {computed.favoriteRole.wins} {copy.winShort} /{' '}
                          {computed.favoriteRole.losses} {copy.lossShort}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-end shrink-0 tabular-nums">
                    <div className="text-xl font-black text-primary">
                      {computed.favoriteRole.winRate}%
                    </div>
                    <div className="text-[11px] font-bold text-text-muted">{copy.winRate}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Role Mastery List */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-text-muted">
                  {copy.roleBreakdownTitle}
                </p>
                {hasLocalData && filter !== 'online' && (
                  <div className="flex items-center gap-2">
                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold text-text-muted hover:text-rose-400 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{copy.resetLocal}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleConfirmResetLocal}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40"
                        >
                          {copy.confirmReset}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold text-text-muted hover:text-text-main"
                        >
                          {copy.cancel}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {computed.roles.map((entry) => {
                  const title = getRoleTitle(entry.role, normalizedLang);
                  return (
                    <div key={entry.role} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <RoleArtwork role={entry.role} alt={title} sizeClass="w-9 h-9" />
                          <div className="min-w-0 text-start">
                            <div className="text-sm font-black text-text-main truncate">
                              {title}
                            </div>
                            <div className="text-xs font-bold text-text-muted tabular-nums">
                              {copy.gamesCount(entry.played)} · {entry.wins} {copy.winShort} ·{' '}
                              {entry.losses} {copy.lossShort}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-text-main tabular-nums shrink-0">
                          {entry.winRate}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-bg-dark overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(4, entry.winRate)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
