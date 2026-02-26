"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const uuid_1 = require("uuid");
const Category_js_1 = require("../../../shared/models/Category.js");
const r2Service_js_1 = require("../../../infra/storage/r2Service.js");
function toSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
class CategoryService {
    /**
     * Public: list all active categories (sorted by order, then name)
     */
    async listActive() {
        const cats = await Category_js_1.Category.find({ isActive: true })
            .sort({ order: 1, name: 1 })
            .lean();
        return cats.map(c => ({ categoryId: c.categoryId, name: c.name, slug: c.slug }));
    }
    /**
     * Admin: list all categories including inactive
     */
    async listAll() {
        const cats = await Category_js_1.Category.find()
            .sort({ order: 1, name: 1 })
            .lean();
        return cats.map(c => ({
            categoryId: c.categoryId,
            name: c.name,
            slug: c.slug,
            isActive: c.isActive,
            order: c.order,
            thumbnailUrl: c.thumbnailUrl ?? null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));
    }
    /**
     * Admin: create a category
     */
    async create(data) {
        const slug = toSlug(data.name);
        const existing = await Category_js_1.Category.findOne({ $or: [{ name: data.name }, { slug }] }).lean();
        if (existing)
            throw new Error('Category with this name already exists');
        const category = new Category_js_1.Category({
            categoryId: (0, uuid_1.v4)(),
            name: data.name.trim(),
            slug,
            isActive: true,
            order: data.order ?? 0,
        });
        await category.save();
        return {
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            isActive: category.isActive,
            order: category.order,
        };
    }
    /**
     * Admin: update a category
     */
    async update(categoryId, data) {
        const $set = {};
        if (data.name !== undefined) {
            $set.name = data.name.trim();
            $set.slug = toSlug(data.name);
        }
        if (data.isActive !== undefined)
            $set.isActive = data.isActive;
        if (data.order !== undefined)
            $set.order = data.order;
        const updated = await Category_js_1.Category.findOneAndUpdate({ categoryId }, { $set }, { new: true }).lean();
        if (!updated)
            throw new Error('Category not found');
        return {
            categoryId: updated.categoryId,
            name: updated.name,
            slug: updated.slug,
            isActive: updated.isActive,
            order: updated.order,
        };
    }
    /**
     * Admin: delete a category
     */
    async delete(categoryId) {
        const result = await Category_js_1.Category.findOneAndDelete({ categoryId }).lean();
        if (!result)
            throw new Error('Category not found');
        return { categoryId, deleted: true };
    }
    /**
     * Admin: get presigned URL to upload category thumbnail
     */
    async getThumbnailUploadUrl(categoryId, mimeType) {
        const cat = await Category_js_1.Category.findOne({ categoryId }).lean();
        if (!cat)
            throw new Error('Category not found');
        const { uploadUrl, key, expiresIn } = await r2Service_js_1.r2Service.getCategoryThumbnailPresignedUrl(categoryId, mimeType);
        const publicUrl = r2Service_js_1.r2Service.getPublicUrl(key);
        return { uploadUrl, key, publicUrl, expiresIn };
    }
    /**
     * Admin: save thumbnail URL after upload completes
     */
    async saveThumbnailUrl(categoryId, thumbnailUrl) {
        const updated = await Category_js_1.Category.findOneAndUpdate({ categoryId }, { $set: { thumbnailUrl } }, { new: true }).lean();
        if (!updated)
            throw new Error('Category not found');
        return {
            categoryId: updated.categoryId,
            name: updated.name,
            slug: updated.slug,
            isActive: updated.isActive,
            order: updated.order,
            thumbnailUrl: updated.thumbnailUrl ?? null,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
}
exports.CategoryService = CategoryService;
//# sourceMappingURL=category.service.js.map