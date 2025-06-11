import { SearchOptions, FileSearchResult, SearchStats, SearchMatch } from './types.js';
import * as nodefs from 'fs';
import fg from 'fast-glob';
import ignore from 'ignore';
import * as path from 'path';

export class SearchEngine {
  private fs: FileSystem;
  private activeSearchAbortController: AbortController | null = null;
  private lastSearchPattern: string | null = null;
  private lastSearchOptions: SearchOptions | null = null;
  private replaceBackup: Map<string, string> = new Map();

  constructor(fs: FileSystem) {
    this.fs = fs;
  }

  /**
   * 执行搜索操作
   * @param searchPattern 搜索文本或正则表达式
   * @param rootPath 搜索根目录
   * @param options 搜索选项
   * @param onProgress 进度回调
   */
  public async search(
    searchPattern: string,
    rootPath: string,
    options: SearchOptions,
    onProgress?: (stats: SearchStats) => void
  ): Promise<FileSearchResult[]> {
    this.lastSearchPattern = searchPattern;
    this.lastSearchOptions = options;
    // 初始化中断控制器
    this.activeSearchAbortController = new AbortController();
    const signal = this.activeSearchAbortController.signal;
    return this.executeSearch(searchPattern, rootPath, options, onProgress, signal);
  }

  /**
   * 中断当前搜索
   */
  public cancelSearch(): void {
    this.activeSearchAbortController?.abort();
  }

  private async executeSearch(
    searchPattern: string,
    rootPath: string,
    options: SearchOptions,
    onProgress?: (stats: SearchStats) => void,
    signal?: AbortSignal
  ): Promise<FileSearchResult[]> {
    const startTime = Date.now();
    // 构造匹配正则
    const regex = this.buildRegex(searchPattern, options);
    // 收集文件列表
    const files = await this.gatherFiles(rootPath, options);
    const results: FileSearchResult[] = [];
    let totalMatches = 0;
    console.error(`Searching in ${files.length} files...`);

    for (const file of files) {
      if (signal?.aborted) break;
      const matches = await this.matchInFile(file, regex, options);
      if (matches.length > 0) {
        totalMatches += matches.length;
        results.push({ filePath: file, matches });
      }
      // 达到最大结果数则停止
      if (options.maxResults && totalMatches >= options.maxResults) {
        break;
      }
      // 进度回调
      onProgress?.({
        totalMatches,
        filesSearched: results.length,
        duration: Date.now() - startTime,
        status: signal?.aborted ? 'cancelled' : 'in-progress',
      });
    }

    // 完成回调
    onProgress?.({
      totalMatches,
      filesSearched: results.length,
      duration: Date.now() - startTime,
      status: 'completed',
    });
    return results;
  }

  private buildRegex(searchPattern: string, options: SearchOptions): RegExp {
    let pattern = searchPattern;
    if (!options.useRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (options.wholeWord) {
      // 自定义全字匹配：单词字符包括字母、数字、下划线和连字符，使用零宽断言
      const wc = '[A-Za-z0-9_-]';
      pattern = `(?<!${wc})${pattern}(?!${wc})`;
    }
    const flags = options.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  }

  private async gatherFiles(rootPath: string, options: SearchOptions): Promise<string[]> {
    // 使用 fast-glob 收集 include
    const entries = await fg(options.include ?? ['**/*'], {
      cwd: rootPath,
      ignore: options.exclude,
      dot: true,
      absolute: true,
    });
    let files = entries.map((p: string) => path.resolve(p));
    // 处理 respectGitIgnore
    if (options.respectGitIgnore) {
      const ig = ignore();
      const gitignorePath = path.join(rootPath, '.gitignore');
      try {
        const content = nodefs.readFileSync(gitignorePath, 'utf-8');
        ig.add(content);
        files = files.filter((f: string) => !ig.ignores(path.relative(rootPath, f)));
      } catch {
        // 忽略不存在情况
      }
    }
    return files;
  }

  private async matchInFile(
    filePath: string,
    regex: RegExp,
    options: SearchOptions
  ): Promise<SearchMatch[]> {
    const content = await this.fs.readFile(filePath);

    const lines = content.split(/\r?\n/);
    const matches: SearchMatch[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        const before = lines.slice(Math.max(0, i - (options.contextLines?.before ?? 0)), i);
        const after = lines.slice(i + 1, i + 1 + (options.contextLines?.after ?? 0));
        matches.push({
          line: i + 1,
          column: match.index + 1,
          text: line,
          matchText: match[0],
          beforeContext: before,
          afterContext: after,
        });
        // Removed single-match break for literal search to allow multiple matches per line
      }
    }
    return matches;
  }

  /**
   * 执行替换操作
   * @param searchResults 搜索结果
   * @param replaceText 替换文本
   * @param options 替换选项
   */
  public async replace(searchResults: FileSearchResult[], replaceText: string): Promise<void> {
    if (!this.lastSearchPattern || !this.lastSearchOptions) {
      throw new Error('No previous search pattern/options');
    }
    // 清除旧备份
    this.replaceBackup.clear();
    const regex = this.buildRegex(this.lastSearchPattern, this.lastSearchOptions);
    for (const result of searchResults) {
      const filePath = result.filePath;
      const content = await this.fs.readFile(filePath);
      this.replaceBackup.set(filePath, content);
      const newContent = content.replace(regex, replaceText);
      await this.fs.writeFile(filePath, newContent);
    }
  }

  /**
   * 预览替换结果
   * @param searchResults 搜索结果
   * @param replaceText 替换文本
   */
  public async previewReplace(
    searchResults: FileSearchResult[],
    replaceText: string
  ): Promise<FileSearchResult[]> {
    // 预览：将 matchText 替换为 replaceText
    return searchResults.map((result) => ({
      filePath: result.filePath,
      matches: result.matches.map((m) => ({ ...m, matchText: replaceText })),
    }));
  }

  /**
   * 撤销上一次替换操作
   */
  public async undoReplace(): Promise<void> {
    for (const [filePath, content] of this.replaceBackup) {
      await this.fs.writeFile(filePath, content);
    }
    this.replaceBackup.clear();
  }

  /**
   * 根据搜索结果生成搜索报告
   * @param results 搜索结果
   * @param rootPath 根目录，用于生成相对路径
   */
  public async generateReport(results: FileSearchResult[], rootPath: string): Promise<string> {
    // 按文件路径排序
    results.sort((a, b) => {
      const pa = path.relative(rootPath, a.filePath).replace(/\\/g, '/').toLowerCase();
      const pb = path.relative(rootPath, b.filePath).replace(/\\/g, '/').toLowerCase();
      return pa.localeCompare(pb);
    });

    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    const fileCount = results.length;
    const reportLines: string[] = [];
    reportLines.push(`${totalMatches} 个结果 - ${fileCount} 文件`, '');

    for (const r of results) {
      const relPath = path.relative(rootPath, r.filePath).replace(/\\/g, '/');
      reportLines.push(`${relPath}:`);
      const content = await this.fs.readFile(r.filePath);
      const fullLines = content.split(/\r?\n/);

      // 代码行左侧行号区格式：空格空格行号区冒号区
      // 行号区：长度为所有匹配行的最大行号字符宽(如100~999为3位)，实际内容为行号右对齐+左补空格
      // 冒号区：匹配到内容的行数为:空格，其它行为两个空格
      const lineNumWidth = ((): number => {
        let maxLine = 0;
        for (const m of r.matches) {
          const endLine = m.line + m.afterContext.length;
          if (endLine > maxLine) {
            maxLine = endLine;
          }
        }
        return maxLine.toString().length;
      })();

      type Block = { start: number; end: number };
      const blocks: Block[] = [];

      for (const m of r.matches) {
        const before = m.beforeContext.length;
        const after = m.afterContext.length;
        const start = m.line - before;
        const end = m.line + after;
        let merged = false;

        for (const b of blocks) {
          if (!(end < b.start || start > b.end)) {
            b.start = Math.min(b.start, start);
            b.end = Math.max(b.end, end);
            merged = true;
            break;
          }
        }

        if (!merged) {
          blocks.push({ start, end });
        }
      }

      blocks.sort((a, b) => a.start - b.start);

      let lastEndLine = 0;
      for (const { start, end } of blocks) {
        // 如果当前块的起始行与上一个块的结束行不连续，则添加空行分隔
        if (lastEndLine !== 0 && start != lastEndLine + 1) {
          reportLines.push('');
        }
        for (let ln = start; ln <= end; ln++) {
          const text = fullLines[ln - 1] || '';
          const isMatchLine = r.matches.some((m) => m.line === ln);
          const numStr = ln.toString().padStart(lineNumWidth, ' ');
          if (isMatchLine) {
            reportLines.push(`  ${numStr}: ${text}`);
          } else {
            reportLines.push(`  ${numStr}  ${text}`);
          }
        }
        lastEndLine = end;
      }
      // 添加空行分隔每个文件的结果
      reportLines.push('');
    }

    return reportLines.join('\n').trimEnd();
  }

  /**
   * 应用用户修改后的报告，并将更改写回对应文件
   * @param reportText 修改后的报告文本
   * @param rootPath 搜索根目录，用于解析相对文件路径
   */
  public async applyReportChange(reportText: string, rootPath: string): Promise<void> {
    const lines = reportText.split(/\r?\n/);
    const fileEdits: Record<string, Record<number, string>> = {};
    let currentFile: string | null = null;
    // 跳过报告头部 (例如 "X 个结果 - Y 文件" 和空行)
    let i = 0;
    if (lines[i] && lines[i].includes('个结果')) {
      i += 1;
    }
    if (lines[i] === '') {
      i += 1;
    }
    // 解析报告内容
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }
      // 文件行: 无缩进，以冒号结尾
      if (!line.startsWith('  ') && line.endsWith(':')) {
        const rel = line.slice(0, -1);
        currentFile = path.resolve(rootPath, rel);
        fileEdits[currentFile] = {};
        i++;
        continue;
      }
      // 代码行: 两个空格缩进
      const m = line.match(/^\s+(\d+)[\s:]+(.*)$/);
      if (m && currentFile) {
        const ln = parseInt(m[1], 10);
        const text = m[2];
        fileEdits[currentFile][ln] = text;
      }
      i++;
    }
    // 应用更改
    for (const [filePath, edits] of Object.entries(fileEdits)) {
      const content = await this.fs.readFile(filePath);
      const fileLines = content.split(/\r?\n/);
      for (const [lnStr, newText] of Object.entries(edits)) {
        const ln = Number(lnStr) - 1;
        if (fileLines[ln] !== newText) {
          fileLines[ln] = newText;
        }
      }
      await this.fs.writeFile(filePath, fileLines.join('\n'));
    }
  }
}

// 搜索历史管理
export class SearchHistory {
  private fs: FileSystem;
  private historyPath: string;

  constructor(fs: FileSystem, historyPath: string = '.searchHistory.json') {
    this.fs = fs;
    this.historyPath = historyPath;
  }

  /**
   * 保存搜索查询
   */
  public saveQuery(searchPattern: string, options: SearchOptions): void {
    let data: Array<{ searchPattern: string; options: SearchOptions }> = [];
    try {
      const content = nodefs.readFileSync(this.historyPath, 'utf-8');
      data = JSON.parse(content) || [];
    } catch {
      data = [];
    }
    data.push({ searchPattern, options });
    nodefs.writeFileSync(this.historyPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 获取搜索历史
   */
  public getHistory(): Array<{ searchPattern: string; options: SearchOptions }> {
    try {
      const content = nodefs.readFileSync(this.historyPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
}

// 文件系统接口
export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(pattern: string[]): Promise<string[]>;
  watchFiles(callback: (path: string) => void): void;
}
