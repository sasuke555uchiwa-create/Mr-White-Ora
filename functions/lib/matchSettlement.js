"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPlayerProfileDocs = readPlayerProfileDocs;
exports.applyMatchSettlementWrites = applyMatchSettlementWrites;
const gameLogic_1 = require("./gameLogic");
async function readPlayerProfileDocs(db, tx, uids) {
    const uniqueUids = Array.from(new Set(uids));
    const refs = uniqueUids.flatMap((uid) => [
        db.collection('users').doc(uid),
        db.collection('publicProfiles').doc(uid),
    ]);
    const snaps = refs.length > 0 ? await tx.getAll(...refs) : [];
    const result = new Map();
    uniqueUids.forEach((uid, index) => {
        const userSnap = snaps[index * 2];
        const pubSnap = snaps[index * 2 + 1];
        result.set(uid, {
            userExists: Boolean(userSnap?.exists),
            userData: userSnap?.exists ? userSnap.data() : null,
            pubExists: Boolean(pubSnap?.exists),
            pubData: pubSnap?.exists ? pubSnap.data() : null,
        });
    });
    return result;
}
function applyMatchSettlementWrites(params) {
    const { db, serverTimestamp, tx, roomRef, roomData, privateStateRef, privateState, players, profileMap, winner, winReason, winningMrWhiteUid = null, extraRoomUpdates = {}, } = params;
    const alreadySettled = Array.isArray(privateState.settledMatches)
        ? privateState.settledMatches.includes(privateState.matchId)
        : false;
    const updatedPlayers = players.map((p) => {
        const role = privateState.rolesByUid[p.uid] || 'citizen';
        if (alreadySettled) {
            return { ...p, revealedRole: role };
        }
        const { xpDelta } = (0, gameLogic_1.computePlayerOnlineReward)(p.uid, players, privateState.rolesByUid, privateState.votesByUid || {}, winner, winReason, winningMrWhiteUid);
        return {
            ...p,
            score: (p.score || 0) + xpDelta,
            revealedRole: role,
        };
    });
    const winnersByUid = {};
    if (!alreadySettled) {
        for (const p of players) {
            const { xpDelta, isWinner } = (0, gameLogic_1.computePlayerOnlineReward)(p.uid, players, privateState.rolesByUid, privateState.votesByUid || {}, winner, winReason, winningMrWhiteUid);
            winnersByUid[p.uid] = isWinner;
            const entry = profileMap.get(p.uid);
            if (!entry)
                continue;
            const baseUser = entry.userData || entry.pubData || {};
            const currentXp = Number(baseUser.xp || 0);
            const nextXp = currentXp + xpDelta;
            const nextLevel = (0, gameLogic_1.calculateLevelFromXp)(nextXp);
            const baseStats = baseUser.stats || {};
            const roleKey = privateState.rolesByUid[p.uid] || 'citizen';
            const prevRoleStats = baseStats.roleStats && typeof baseStats.roleStats === 'object' ? baseStats.roleStats : {};
            const prevRoleEntry = prevRoleStats[roleKey] || {};
            const nextRoleStats = {
                ...prevRoleStats,
                [roleKey]: {
                    played: Number(prevRoleEntry.played || 0) + 1,
                    wins: Number(prevRoleEntry.wins || 0) + (isWinner ? 1 : 0),
                },
            };
            const nextCurrentStreak = isWinner ? Number(baseStats.currentStreak || 0) + 1 : 0;
            const nextLongestStreak = Math.max(Number(baseStats.longestStreak || 0), nextCurrentStreak);
            const nextStats = {
                wins: Number(baseStats.wins || 0) + (isWinner ? 1 : 0),
                hosted: Number(baseStats.hosted || 0),
                played: Number(baseStats.played || 0) + 1,
                longestStreak: nextLongestStreak,
                currentStreak: nextCurrentStreak,
                roleStats: nextRoleStats,
            };
            const userRef = db.collection('users').doc(p.uid);
            const pubRef = db.collection('publicProfiles').doc(p.uid);
            if (entry.userExists) {
                tx.update(userRef, {
                    xp: nextXp,
                    level: nextLevel,
                    stats: nextStats,
                    updatedAt: serverTimestamp(),
                });
            }
            const displayName = (typeof baseUser.displayName === 'string' && baseUser.displayName) || p.name;
            const photoURL = (typeof baseUser.photoURL === 'string' && baseUser.photoURL) || p.avatar;
            if (entry.pubExists) {
                tx.update(pubRef, {
                    displayName,
                    photoURL,
                    xp: nextXp,
                    level: nextLevel,
                    stats: nextStats,
                    updatedAt: serverTimestamp(),
                });
            }
            else {
                tx.set(pubRef, {
                    uid: p.uid,
                    displayName,
                    photoURL,
                    xp: nextXp,
                    level: nextLevel,
                    stats: nextStats,
                    updatedAt: serverTimestamp(),
                });
            }
        }
        const nextSettled = [...(privateState.settledMatches || []), privateState.matchId].slice(-20);
        tx.update(privateStateRef, {
            votesByUid: privateState.votesByUid || {},
            settledMatches: nextSettled,
            updatedAt: serverTimestamp(),
        });
    }
    else {
        for (const p of players) {
            const { isWinner } = (0, gameLogic_1.computePlayerOnlineReward)(p.uid, players, privateState.rolesByUid, privateState.votesByUid || {}, winner, winReason, winningMrWhiteUid);
            winnersByUid[p.uid] = isWinner;
        }
    }
    const publicGameState = {
        ...(roomData.gameState || {}),
        phase: 'RESULT',
        winner,
        winReason,
        winningMrWhiteUid,
        turnEndsAt: null,
        guesserUid: null,
        revealedResult: {
            secretWord: privateState.civilianWord,
            undercoverWord: privateState.undercoverWord,
            impostorId: privateState.impostorIds[0] || null,
            undercoverIds: privateState.undercoverIds || [],
            rolesByUid: privateState.rolesByUid,
            votesByUid: privateState.votesByUid || {},
            winnersByUid,
        },
    };
    tx.update(roomRef, {
        ...extraRoomUpdates,
        players: updatedPlayers,
        playerIds: updatedPlayers.map((p) => p.uid),
        gameState: publicGameState,
        updatedAt: serverTimestamp(),
    });
}
//# sourceMappingURL=matchSettlement.js.map