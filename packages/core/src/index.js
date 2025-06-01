import * as nodefs from 'fs';
import fg from 'fast-glob';
import ignore from 'ignore';
import * as path from 'path';
export class SearchEngine {
    constructor(fs) {
        this.activeSearchAbortController = null;
        this.lastSearchPattern = null;
        this.lastSearchOptions = null;
        this.replaceBackup = new Map();
        this.fs = fs;
    }
    /**
     * 执行搜索操作
     * @param searchPattern 搜索文本或正则表达式
     * @param rootPath 搜索根目录
     * @param options 搜索选项
     * @param onProgress 进度回调
     */
    async search(searchPattern, rootPath, options, onProgress) {
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
    cancelSearch() {
        this.activeSearchAbortController?.abort();
    }
    async executeSearch(searchPattern, rootPath, options, onProgress, signal) {
        const startTime = Date.now();
        // 构造匹配正则
        const regex = this.buildRegex(searchPattern, options);
        // 收集文件列表
        const files = await this.gatherFiles(rootPath, options);
        const results = [];
        let totalMatches = 0;
        for (const file of files) {
            if (signal?.aborted)
                break;
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
    buildRegex(searchPattern, options) {
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
    async gatherFiles(rootPath, options) {
        // 使用 fast-glob 收集 includePattern
        const entries = await fg(options.includePattern, {
            cwd: rootPath,
            ignore: options.excludePattern,
            dot: true,
            absolute: true,
        });
        let files = entries.map((p) => path.resolve(p));
        // 处理 respectGitIgnore
        if (options.respectGitIgnore) {
            const ig = ignore();
            const gitignorePath = path.join(rootPath, '.gitignore');
            try {
                const content = nodefs.readFileSync(gitignorePath, 'utf-8');
                ig.add(content);
                files = files.filter((f) => !ig.ignores(path.relative(rootPath, f)));
            }
            catch {
                // 忽略不存在情况
            }
        }
        return files;
    }
    async matchInFile(filePath, regex, options) {
        const content = await this.fs.readFile(filePath);
        const lines = content.split(/\r?\n/);
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(line)) !== null) {
                const before = lines.slice(Math.max(0, i - options.contextLines.before), i);
                const after = lines.slice(i + 1, i + 1 + options.contextLines.after);
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
    async replace(searchResults, replaceText, _options) {
        // 使用_options以避免未使用变量错误
        _options;
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
    async previewReplace(searchResults, replaceText) {
        // 预览：将 matchText 替换为 replaceText
        return searchResults.map((result) => ({
            filePath: result.filePath,
            matches: result.matches.map((m) => ({ ...m, matchText: replaceText })),
        }));
    }
    /**
     * 撤销上一次替换操作
     */
    async undoReplace() {
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
    async generateReport(results, rootPath) {
        // 按文件路径排序
        results.sort((a, b) => {
            const pa = path.relative(rootPath, a.filePath).replace(/\\/g, '/').toLowerCase();
            const pb = path.relative(rootPath, b.filePath).replace(/\\/g, '/').toLowerCase();
            return pa.localeCompare(pb);
        });
        const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
        const fileCount = results.length;
        const reportLines = [];
        reportLines.push(`${totalMatches} 个结果 - ${fileCount} 文件`, '');
        for (const r of results) {
            const relPath = path.relative(rootPath, r.filePath).replace(/\\/g, '/');
            reportLines.push(`${relPath}:`);
            const content = await this.fs.readFile(r.filePath);
            const fullLines = content.split(/\r?\n/);
            // 代码行左侧行号区格式：空格空格行号区冒号区
            // 行号区：长度为所有匹配行的最大行号字符宽(如100~999为3位)，实际内容为行号右对齐+左补空格
            // 冒号区：匹配到内容的行数为:空格，其它行为两个空格
            const lineNumWidth = (() => {
                let maxLine = 0;
                for (const m of r.matches) {
                    const endLine = m.line + m.afterContext.length;
                    if (endLine > maxLine) {
                        maxLine = endLine;
                    }
                }
                return maxLine.toString().length;
            })();
            const blocks = [];
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
                    }
                    else {
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
    async applyReportChange(reportText, rootPath) {
        const lines = reportText.split(/\r?\n/);
        const fileEdits = {};
        let currentFile = null;
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
    constructor(fs, historyPath = '.searchHistory.json') {
        this.fs = fs;
        this.historyPath = historyPath;
    }
    /**
     * 保存搜索查询
     */
    saveQuery(searchPattern, options) {
        let data = [];
        try {
            const content = nodefs.readFileSync(this.historyPath, 'utf-8');
            data = JSON.parse(content) || [];
        }
        catch {
            data = [];
        }
        data.push({ searchPattern, options });
        nodefs.writeFileSync(this.historyPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    /**
     * 获取搜索历史
     */
    getHistory() {
        try {
            const content = nodefs.readFileSync(this.historyPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
}
