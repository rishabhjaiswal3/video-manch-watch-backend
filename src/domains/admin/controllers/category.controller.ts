import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';

const categoryService = new CategoryService();

export class CategoryController {

  /**
   * GET /categories — public, active categories only
   */
  async listPublic(_req: Request, res: Response) {
    try {
      const data = await categoryService.listActive();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-LIST-PUBLIC] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /admin/categories — all categories (admin)
   */
  async listAll(_req: Request, res: Response) {
    try {
      const data = await categoryService.listAll();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-LIST-ALL] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /admin/categories — create (admin)
   */
  async create(req: Request, res: Response) {
    try {
      const { name, order } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Category name is required' });
      }
      const data = await categoryService.create({ name, order });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-CREATE] Error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /admin/categories/:categoryId — update (admin)
   */
  async update(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const { name, isActive, order } = req.body;
      const data = await categoryService.update(categoryId, { name, isActive, order });
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-UPDATE] Error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /admin/categories/:categoryId — delete (admin)
   */
  async delete(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const data = await categoryService.delete(categoryId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-DELETE] Error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /admin/categories/:categoryId/thumbnail-url
   * Returns a presigned PUT URL for uploading a thumbnail image
   * body: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
   */
  async getThumbnailUploadUrl(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const { mimeType } = req.body;
      if (!mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        return res.status(400).json({ success: false, error: 'Valid mimeType required (image/jpeg, image/png, image/webp)' });
      }
      const data = await categoryService.getThumbnailUploadUrl(categoryId, mimeType);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-THUMBNAIL-URL] Error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /admin/categories/:categoryId/thumbnail
   * Saves the public thumbnail URL after client finishes the R2 upload
   * body: { thumbnailUrl: string }
   */
  async saveThumbnail(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const { thumbnailUrl } = req.body;
      if (!thumbnailUrl) {
        return res.status(400).json({ success: false, error: 'thumbnailUrl is required' });
      }
      const data = await categoryService.saveThumbnailUrl(categoryId, thumbnailUrl);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('[CATEGORY-THUMBNAIL-SAVE] Error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
  }
}
