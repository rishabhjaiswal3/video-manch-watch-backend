import { Request, Response } from 'express';
export declare class CategoryController {
    /**
     * GET /categories — public, active categories only
     */
    listPublic(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /admin/categories — all categories (admin)
     */
    listAll(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/categories — create (admin)
     */
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/categories/:categoryId — update (admin)
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /admin/categories/:categoryId — delete (admin)
     */
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/categories/:categoryId/thumbnail-url
     * Returns a presigned PUT URL for uploading a thumbnail image
     * body: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
     */
    getThumbnailUploadUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/categories/:categoryId/thumbnail
     * Saves the public thumbnail URL after client finishes the R2 upload
     * body: { thumbnailUrl: string }
     */
    saveThumbnail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=category.controller.d.ts.map