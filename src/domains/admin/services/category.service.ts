import { v4 as uuidv4 } from 'uuid';
import { Category } from '../../../shared/models/Category.js';
import { r2Service } from '../../../infra/storage/r2Service.js';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export class CategoryService {

  /**
   * Public: list all active categories (sorted by order, then name)
   */
  async listActive() {
    const cats = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();
    return cats.map(c => ({ categoryId: c.categoryId, name: c.name, slug: c.slug }));
  }

  /**
   * Admin: list all categories including inactive
   */
  async listAll() {
    const cats = await Category.find()
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
  async create(data: { name: string; order?: number }) {
    const slug = toSlug(data.name);

    const existing = await Category.findOne({ $or: [{ name: data.name }, { slug }] }).lean();
    if (existing) throw new Error('Category with this name already exists');

    const category = new Category({
      categoryId: uuidv4(),
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
  async update(categoryId: string, data: { name?: string; isActive?: boolean; order?: number }) {
    const $set: Record<string, unknown> = {};
    if (data.name !== undefined) {
      $set.name = data.name.trim();
      $set.slug = toSlug(data.name);
    }
    if (data.isActive !== undefined) $set.isActive = data.isActive;
    if (data.order !== undefined) $set.order = data.order;

    const updated = await Category.findOneAndUpdate(
      { categoryId },
      { $set },
      { new: true }
    ).lean();

    if (!updated) throw new Error('Category not found');
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
  async delete(categoryId: string) {
    const result = await Category.findOneAndDelete({ categoryId }).lean();
    if (!result) throw new Error('Category not found');
    return { categoryId, deleted: true };
  }

  /**
   * Admin: get presigned URL to upload category thumbnail
   */
  async getThumbnailUploadUrl(categoryId: string, mimeType: string) {
    const cat = await Category.findOne({ categoryId }).lean();
    if (!cat) throw new Error('Category not found');
    const { uploadUrl, key, expiresIn } = await r2Service.getCategoryThumbnailPresignedUrl(categoryId, mimeType);
    const publicUrl = r2Service.getPublicUrl(key);
    return { uploadUrl, key, publicUrl, expiresIn };
  }

  /**
   * Admin: save thumbnail URL after upload completes
   */
  async saveThumbnailUrl(categoryId: string, thumbnailUrl: string) {
    const updated = await Category.findOneAndUpdate(
      { categoryId },
      { $set: { thumbnailUrl } },
      { new: true }
    ).lean();
    if (!updated) throw new Error('Category not found');
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
