export declare class CategoryService {
    /**
     * Public: list all active categories (sorted by order, then name)
     */
    listActive(): Promise<{
        categoryId: string;
        name: string;
        slug: string;
    }[]>;
    /**
     * Admin: list all categories including inactive
     */
    listAll(): Promise<{
        categoryId: string;
        name: string;
        slug: string;
        isActive: boolean;
        order: number;
        thumbnailUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Admin: create a category
     */
    create(data: {
        name: string;
        order?: number;
    }): Promise<{
        categoryId: string;
        name: string;
        slug: string;
        isActive: boolean;
        order: number;
    }>;
    /**
     * Admin: update a category
     */
    update(categoryId: string, data: {
        name?: string;
        isActive?: boolean;
        order?: number;
    }): Promise<{
        categoryId: string;
        name: string;
        slug: string;
        isActive: boolean;
        order: number;
    }>;
    /**
     * Admin: delete a category
     */
    delete(categoryId: string): Promise<{
        categoryId: string;
        deleted: boolean;
    }>;
    /**
     * Admin: get presigned URL to upload category thumbnail
     */
    getThumbnailUploadUrl(categoryId: string, mimeType: string): Promise<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
        expiresIn: number;
    }>;
    /**
     * Admin: save thumbnail URL after upload completes
     */
    saveThumbnailUrl(categoryId: string, thumbnailUrl: string): Promise<{
        categoryId: string;
        name: string;
        slug: string;
        isActive: boolean;
        order: number;
        thumbnailUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=category.service.d.ts.map