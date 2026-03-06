export declare class PlaylistService {
    /**
     * List all playlists for a user, including a preview of the first 8 video titles
     */
    listPlaylists(userId: string): Promise<{
        playlistId: string;
        title: string;
        thumbnailUrl: string | null;
        videoCount: number;
        videoIds: string[];
        previewVideos: {
            videoId: string;
            title: string;
            thumbnail: string | null;
            duration: any;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Create a new playlist
     */
    createPlaylist(userId: string, title: string): Promise<{
        playlistId: string;
        title: string;
        videoCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Add a video to a playlist
     */
    addVideoToPlaylist(_userId: string, playlistId: string, videoId: string): Promise<{
        playlistId: string;
        videoId: string;
        added: boolean;
        message: string;
        videoCount?: undefined;
    } | {
        playlistId: string;
        videoId: string;
        added: boolean;
        videoCount: number;
        message?: undefined;
    }>;
    /**
     * Create a new playlist and immediately add a video to it
     */
    createPlaylistWithVideo(userId: string, title: string, videoId: string): Promise<{
        playlistId: string;
        title: string;
        videoCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Remove a video from a playlist
     */
    removeVideoFromPlaylist(userId: string, playlistId: string, videoId: string): Promise<{
        playlistId: string;
        videoId: string;
        removed: boolean;
        message: string;
        videoCount?: undefined;
    } | {
        playlistId: string;
        videoId: string;
        removed: boolean;
        videoCount: number;
        message?: undefined;
    }>;
    /**
     * Rename a playlist
     */
    updatePlaylist(userId: string, playlistId: string, title: string): Promise<{
        playlistId: string;
        title: string;
        thumbnailUrl: string | null;
        videoCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Delete a playlist
     */
    deletePlaylist(userId: string, playlistId: string): Promise<{
        playlistId: string;
        deleted: boolean;
    }>;
    /**
     * Get a single playlist with full video details (ordered by playlist order)
     */
    getPlaylist(userId: string, playlistId: string): Promise<{
        playlistId: string;
        title: string;
        thumbnailUrl: string | null;
        videoIds: string[];
        videos: {
            videoId: string;
            title: string;
            thumbnail: string | null;
            duration: any;
        }[];
        videoCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Get presigned URL to upload a playlist thumbnail
     */
    getThumbnailUploadUrl(userId: string, playlistId: string, mimeType: string): Promise<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
        expiresIn: number;
    }>;
    /**
     * Save thumbnail URL after upload completes
     */
    saveThumbnailUrl(userId: string, playlistId: string, thumbnailUrl: string): Promise<{
        playlistId: string;
        title: string;
        thumbnailUrl: string | null;
        videoCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=playlist.service.d.ts.map