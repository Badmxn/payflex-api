"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptObject = exports.encryptObject = exports.decrypt = exports.encrypt = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const SECRET = process.env.ENCRYPTION_KEY || 'payflex-encryption-key-change-in-production';
const encrypt = (text) => {
    return crypto_js_1.default.AES.encrypt(text, SECRET).toString();
};
exports.encrypt = encrypt;
const decrypt = (ciphertext) => {
    const bytes = crypto_js_1.default.AES.decrypt(ciphertext, SECRET);
    return bytes.toString(crypto_js_1.default.enc.Utf8);
};
exports.decrypt = decrypt;
const encryptObject = (obj, fields) => {
    const result = { ...obj };
    for (const field of fields) {
        if (result[field]) {
            result[field] = (0, exports.encrypt)(result[field]);
        }
    }
    return result;
};
exports.encryptObject = encryptObject;
const decryptObject = (obj, fields) => {
    const result = { ...obj };
    for (const field of fields) {
        if (result[field]) {
            try {
                result[field] = (0, exports.decrypt)(result[field]);
            }
            catch {
                // field may not be encrypted
            }
        }
    }
    return result;
};
exports.decryptObject = decryptObject;
