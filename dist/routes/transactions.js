"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.protect, transactionController_1.createTransaction);
router.get('/', auth_1.protect, transactionController_1.getTransactions);
exports.default = router;
