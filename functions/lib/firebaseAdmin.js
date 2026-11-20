"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.db = exports.FIRESTORE_DATABASE_ID = exports.FIREBASE_PROJECT_ID = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
exports.FIREBASE_PROJECT_ID = 'mercurial-yew-f6tp2';
exports.FIRESTORE_DATABASE_ID = 'ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4';
const app = (0, app_1.getApps)().length
    ? (0, app_1.getApp)()
    : (0, app_1.initializeApp)({ projectId: exports.FIREBASE_PROJECT_ID });
exports.db = (0, firestore_1.getFirestore)(app, exports.FIRESTORE_DATABASE_ID);
exports.adminAuth = (0, auth_1.getAuth)(app);
//# sourceMappingURL=firebaseAdmin.js.map