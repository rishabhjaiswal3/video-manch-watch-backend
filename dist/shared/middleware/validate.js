"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors,
                });
            }
            return res.status(400).json({
                success: false,
                error: 'Invalid request data',
            });
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map