"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_js_1 = require("./controllers/category.controller.js");
const router = (0, express_1.Router)();
const categoryController = new category_controller_js_1.CategoryController();
// Public — no auth required
router.get('/', (req, res) => categoryController.listPublic(req, res));
exports.default = router;
//# sourceMappingURL=category.routes.js.map