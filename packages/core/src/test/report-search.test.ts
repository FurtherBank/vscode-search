import { SearchEngine, FileSystem } from '../index.js';
import { SearchOptions } from '../types.js';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DiskFS } from './utils/diskfs.js';

describe('SearchEngine generateReport', () => {
  let fs: FileSystem;
  let engine: SearchEngine;
  let root: string;
  let tempDir: string;

  beforeAll(async () => {
    const casesDir = path.join(__dirname, 'cases/report');
    tempDir = path.join(os.tmpdir(), 'vscode-search-cases-report');
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

  it('matching result', async () => {
    const options: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 1, after: 1 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const results = await engine.search('props', root, options);
    const report = await engine.generateReport(results, root);
    const expected = await fsPromises.readFile(path.join(root, 'result.txt'), 'utf8');
    expect(report).toBe(expected.trimEnd());
  });

  it('matching result(wholeWord)', async () => {
    const options: SearchOptions = {
      caseSensitive: false,
      wholeWord: true,
      useRegex: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [],
      maxResults: undefined,
      contextLines: { before: 1, after: 1 },
      searchInResults: false,
      respectGitIgnore: false,
    };
    const results = await engine.search('props', root, options);
    const report = await engine.generateReport(results, root);
    const expected = await fsPromises.readFile(path.join(root, 'result-wholeword.txt'), 'utf8');
    expect(report).toBe(expected.trimEnd());
  });
});
