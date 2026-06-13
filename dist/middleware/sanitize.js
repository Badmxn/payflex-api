"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hpp = exports.sanitizeInput = void 0;
const xss_1 = __importDefault(require("xss"));
const hpp_1 = __importDefault(require("hpp"));
exports.hpp = hpp_1.default;
const sanitizeObject = (obj) => {
    if (typeof obj === 'string')
        return (0, xss_1.default)(obj);
    if (Array.isArray(obj))
        return obj.map(sanitizeObject);
    if (obj && typeof obj === 'object') {
        const clean = {};
        for (const key of Object.keys(obj)) {
            clean[key] = sanitizeObject(obj[key]);
        }
        return clean;
    }
    return obj;
};
const sanitizeInput = (req, res, next) => {
    if (req.body)
        req.body = sanitizeObject(req.body);
    if (req.params)
        req.params = sanitizeObject(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
