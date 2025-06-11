import { SearchEngine, FileSystem } from '../index.js';
import { SearchOptions, FileSearchResult } from '../types.js';
import { promises as fsPromises } from 'fs';
import { DiskFS } from './utils/diskfs.js';
import * as path from 'path';
import * as os from 'os';

describe('SearchEngine', () => {
  // 使用静态用例文件目录
  let fs: FileSystem;
  let engine: SearchEngine;
  let root: string;
  let tempDir: string;

  beforeAll(async () => {
    const casesDir = path.join(__dirname, 'cases/basic');
    tempDir = path.join(os.tmpdir(), 'vscode-search-cases-basic');
    await fsPromises.rm(tempDir, { recursive: true, force: true });
    await fsPromises.mkdir(tempDir, { recursive: true });
    await fsPromises.cp(casesDir, tempDir, { recursive: true });
    root = tempDir;
    fs = new DiskFS(root);
    engine = new SearchEngine(fs);
  });
  afterAll(async () => {
    if (tempDir) await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  const options: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    include: ['*.txt'],
    exclude: [],
    maxResults: undefined,
    contextLines: { before: 1, after: 1 },
    searchInResults: false,
    respectGitIgnore: false,
  };

  it('should find all matches', async () => {
    const results = await engine.search('foo', root, options);
    expect(results).toHaveLength(1);
    const [res] = results;
    expect(path.basename(res.filePath)).toBe('file1.txt');
    expect(res.matches.length).toBe(2);
    expect(res.matches[0].matchText).toBe('foo');
    expect(res.matches[1].matchText).toBe('foo');
  });

  it('should preview replace correctly', async () => {
    const searchResults: FileSearchResult[] = [
      {
        filePath: 'file1.txt',
        matches: [
          {
            line: 1,
            column: 1,
            text: 'foo bar foo',
            matchText: 'foo',
            beforeContext: [],
            afterContext: [],
          },
        ],
      },
    ];
    const preview = await engine.previewReplace(searchResults, 'baz');
    expect(preview[0].matches[0].matchText).toBe('baz');
  });

  it('should replace and undo correctly', async () => {
    const searchResults = await engine.search('bar', root, options);
    await engine.replace(searchResults, 'qux');
    const contentAfter = await fsPromises.readFile(path.join(root, 'file1.txt'), 'utf8');
    expect(contentAfter.trimEnd()).toBe('foo qux foo');
    await engine.undoReplace();
    const contentBefore = await fsPromises.readFile(path.join(root, 'file1.txt'), 'utf8');
    expect(contentBefore.trimEnd()).toBe('foo bar foo');
  });
});

describe('SearchEngine option flags', () => {
  let fs: FileSystem;
  let engine: SearchEngine;
  let root: string;
  let tempDir: string;

  beforeAll(async () => {
    const casesDir = path.join(__dirname, 'cases/flags');
    tempDir = path.join(os.tmpdir(), 'vscode-search-cases-flags');
    await fsPromises.rm(tempDir, { recursive: true, force: true });
    await fsPromises.mkdir(tempDir, { recursive: true });
    await fsPromises.cp(casesDir, tempDir, { recursive: true });

    root = tempDir;
    fs = new DiskFS(root);
    engine = new SearchEngine(fs);
  });
  afterAll(async () => {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  it('case sensitive only matches exact case', async () => {
    const opts: SearchOptions = {
      caseSensitive: true,
      wholeWord: false,
      useRegex: false,
      include: ['case.txt'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 0, after: 0 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const res = await engine.search('foo', root, opts);
    expect(res).toHaveLength(1);
    expect(res[0].matches.length).toBe(1);
  });

  it('whole word only matches standalone words', async () => {
    const opts: SearchOptions = {
      caseSensitive: false,
      wholeWord: true,
      useRegex: false,
      include: ['word.txt'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 0, after: 0 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const res = await engine.search('foo', root, opts);
    expect(res).toHaveLength(1);
    expect(res[0].matches.length).toBe(2);
  });

  it('regex search finds pattern matches', async () => {
    const opts: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: true,
      include: ['regex.txt'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 0, after: 0 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const res = await engine.search('\\w+\\d', root, opts);
    expect(res).toHaveLength(1);
    expect(res[0].matches.length).toBe(3);
  });

  it('context lines shows surrounding lines', async () => {
    const opts: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      include: ['ctx.txt'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 1, after: 1 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const res = await engine.search('foo', root, opts);
    expect(res).toHaveLength(1);
    const match = res[0].matches[0];
    expect(match.beforeContext).toEqual(['a']);
    expect(match.afterContext).toEqual(['b']);
  });

  it('include and exclude patterns filter files', async () => {
    const opts: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      include: ['include/**/*.ts'],
      exclude: ['**/exclude/**'],
      maxResults: undefined,
      contextLines: { before: 0, after: 0 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const res = await engine.search('export', root, opts);
    expect(res).toHaveLength(1);
    expect(path.basename(res[0].filePath)).toBe('a.ts');
  });

  it('respects gitignore configuration', async () => {
    // ci 环境中被 ignored 文件不存在，需要加上
    const ignoredPath = path.join(root, 'ignored.txt');
    const fileExists = await fsPromises
      .access(ignoredPath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      await fsPromises.writeFile(ignoredPath, 'ignore this file\n');
    }

    const optsIgnore: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      include: ['*.txt'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 0, after: 0 },
      searchInResults: false,
      respectGitIgnore: true,
    };
    const resIgnore = await engine.search('ignore', root, optsIgnore);
    expect(resIgnore).toHaveLength(0);

    const optsNoIgnore: SearchOptions = { ...optsIgnore, respectGitIgnore: false };
    const resNoIgnore = await engine.search('ignore', root, optsNoIgnore);
    expect(resNoIgnore).toHaveLength(1);
  });
});
