"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENFORCE_APP_CHECK = void 0;
exports.resolveEnforceAppCheck = resolveEnforceAppCheck;
exports.getCallableOptions = getCallableOptions;
/**
 * Resolves whether Firebase App Check should be enforced on callable endpoints.
 * - Explicit ENFORCE_APP_CHECK="true" / "false" always wins.
 * - In deployed Cloud Functions production (K_SERVICE / FUNCTION_TARGET without
 *   FUNCTIONS_EMULATOR or test flags), enforcement fails closed (true).
 * - In local dev, emulators, and unit tests, defaults to false unless overridden.
 */
function resolveEnforceAppCheck(env = process.env) {
    if (env.ENFORCE_APP_CHECK === 'true')
        return true;
    if (env.ENFORCE_APP_CHECK === 'false')
        return false;
    const isEmulator = env.FUNCTIONS_EMULATOR === 'true';
    const isTest = env.NODE_ENV === 'test' || Boolean(env.VITEST);
    const isDeployedProd = !isEmulator &&
        !isTest &&
        Boolean(env.K_SERVICE || env.FUNCTION_TARGET || env.CLOUD_RUNTIME_CONFIG);
    return isDeployedProd;
}
exports.ENFORCE_APP_CHECK = resolveEnforceAppCheck();
function getCallableOptions(overrides = {}) {
    return {
        enforceAppCheck: exports.ENFORCE_APP_CHECK,
        consumeAppCheckToken: false,
        ...overrides,
    };
}
//# sourceMappingURL=callableConfig.js.map