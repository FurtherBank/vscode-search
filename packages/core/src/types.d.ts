export interface SearchOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
    includePattern: string[];
    excludePattern: string[];
    maxResults?: number;
    contextLines: {
        before: number;
        after: number;
    };
    searchInResults: boolean;
    respectGitIgnore: boolean;
}
export interface SearchMatch {
    line: number;
    column: number;
    text: string;
    matchText: string;
    beforeContext: string[];
    afterContext: string[];
}
export interface FileSearchResult {
    filePath: string;
    matches: SearchMatch[];
}
export interface SearchStats {
    totalMatches: number;
    filesSearched: number;
    duration: number;
    status: 'in-progress' | 'completed' | 'cancelled';
}
export interface ReplaceOptions {
    preview: boolean;
    selectedOnly: boolean;
}
