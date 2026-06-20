"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cryptoController_1 = require("../controllers/cryptoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/prices', auth_1.protect, cryptoController_1.getCryptoPrices);
exports.default = router;
