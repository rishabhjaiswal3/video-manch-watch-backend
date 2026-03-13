export declare class ConfigService {
    /**
     * Get current player script URL — DB is source of truth, hardcoded URL is last resort fallback.
     */
    getPlayerUrl(): Promise<string>;
    /**
     * Update player script URL
     */
    updatePlayerUrl(newUrl: string): Promise<string>;
}
//# sourceMappingURL=config.service.d.ts.map