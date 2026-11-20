import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getCallableOptions } from './callableConfig';
import { DbLike, FunctionActionError } from './errors';
import { db } from './firebaseAdmin';
import {
  executeAdvanceTurn,
  executeBeginMatch,
  executeMarkRevealReady,
  executeNextMatch,
  executeProceedAfterVoteReveal,
  executeResolveVotes,
  executeReturnToLobby,
  executeStartRound,
  executeStartVoting,
  executeSubmitClue,
  executeSubmitMrWhiteGuess,
  executeSubmitVote,
} from './gameHandlers';

const deps = {
  db: db as unknown as DbLike,
  serverTimestamp: () => FieldValue.serverTimestamp(),
  toTimestamp: (ms: number) => Timestamp.fromMillis(ms),
};

function handleCallable<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof FunctionActionError) {
      throw new HttpsError(err.code, err.message);
    }
    throw err;
  });
}

const callableOpts = getCallableOptions();

export const beginMatch = onCall(callableOpts, (request) =>
  handleCallable(() => executeBeginMatch(deps, request.auth?.uid, request.data || {}))
);

export const startRound = onCall(callableOpts, (request) =>
  handleCallable(() => executeStartRound(deps, request.auth?.uid, request.data || {}))
);

export const markRevealReady = onCall(callableOpts, (request) =>
  handleCallable(() => executeMarkRevealReady(deps, request.auth?.uid, request.data || {}))
);

export const submitClue = onCall(callableOpts, (request) =>
  handleCallable(() => executeSubmitClue(deps, request.auth?.uid, request.data || {}))
);

export const advanceTurn = onCall(callableOpts, (request) =>
  handleCallable(() => executeAdvanceTurn(deps, request.auth?.uid, request.data || {}))
);

export const startVoting = onCall(callableOpts, (request) =>
  handleCallable(() => executeStartVoting(deps, request.auth?.uid, request.data || {}))
);

export const submitVote = onCall(callableOpts, (request) =>
  handleCallable(() => executeSubmitVote(deps, request.auth?.uid, request.data || {}))
);

export const resolveVotes = onCall(callableOpts, (request) =>
  handleCallable(() => executeResolveVotes(deps, request.auth?.uid, request.data || {}))
);

export const proceedAfterVoteReveal = onCall(callableOpts, (request) =>
  handleCallable(() =>
    executeProceedAfterVoteReveal(deps, request.auth?.uid, request.data || {})
  )
);

export const submitMrWhiteGuess = onCall(callableOpts, (request) =>
  handleCallable(() => executeSubmitMrWhiteGuess(deps, request.auth?.uid, request.data || {}))
);

export const returnToLobby = onCall(callableOpts, (request) =>
  handleCallable(() => executeReturnToLobby(deps, request.auth?.uid, request.data || {}))
);

export const nextMatch = onCall(callableOpts, (request) =>
  handleCallable(() => executeNextMatch(deps, request.auth?.uid, request.data || {}))
);
