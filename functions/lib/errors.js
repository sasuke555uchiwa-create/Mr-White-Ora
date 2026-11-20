"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionActionError = void 0;
class FunctionActionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'FunctionActionError';
        this.code = code;
    }
}
exports.FunctionActionError = FunctionActionError;
//# sourceMappingURL=errors.js.map