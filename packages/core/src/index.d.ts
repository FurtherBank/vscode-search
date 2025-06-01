import { SearchOptions, FileSearchResult, SearchStats, ReplaceOptions } from './types.js';
export declare class SearchEngine {
    private fs;
    private activeSearchAbortController;
    private lastSearchPattern;
    private lastSearchOptions;
    private replaceBackup;
    constructor(fs: FileSystem);
    /**
     * 执行搜索操作
     * @param searchPattern 搜索文本或正则表达式
     * @param rootPath 搜索根目录
     * @param options 搜索选项
     * @param onProgress 进度回调
     */
    search(searchPattern: string, rootPath: string, options: SearchOptions, onProgress?: (stats: SearchStats) => void): Promise<FileSearchResult[]>;
    /**
     * 中断当前搜索
     */
    cancelSearch(): void;
    private executeSearch;
    private buildRegex;
    private gatherFiles;
    private matchInFile;
    /**
     * 执行替换操作
     * @param searchResults 搜索结果
     * @param replaceText 替换文本
     * @param options 替换选项
     */
    replace(searchResults: FileSearchResult[], replaceText: string, _options: ReplaceOptions): Promise<void>;
    /**
     * 预览替换结果
     * @param searchResults 搜索结果
     * @param replaceText 替换文本
     */
    previewReplace(searchResults: FileSearchResult[], replaceText: string): Promise<FileSearchResult[]>;
    /**
     * 撤销上一次替换操作
     */
    undoReplace(): Promise<void>;
    /**
     * 根据搜索结果生成搜索报告
     * @param results 搜索结果
     * @param rootPath 根目录，用于生成相对路径
     */
    generateReport(results: FileSearchResult[], rootPath: string): Promise<string>;
    /**
     * 应用用户修改后的报告，并将更改写回对应文件
     * @param reportText 修改后的报告文本
     * @param rootPath 搜索根目录，用于解析相对文件路径
     */
    applyReportChange(reportText: string, rootPath: string): Promise<void>;
}
export declare class SearchHistory {
    private fs;
    private historyPath;
    constructor(fs: FileSystem, historyPath?: string);
    /**
     * 保存搜索查询
     */
    saveQuery(searchPattern: string, options: SearchOptions): void;
    /**
     * 获取搜索历史
     */
    getHistory(): Array<{
        searchPattern: string;
        options: SearchOptions;
    }>;
}
export interface FileSystem {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    listFiles(pattern: string[]): Promise<string[]>;
    watchFiles(callback: (path: string) => void): void;
}
