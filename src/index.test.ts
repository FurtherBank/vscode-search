import { SearchEngine, FileSystem } from './index';
import { SearchOptions, ReplaceOptions, FileSearchResult } from './types';

// 内存文件系统模拟实现 FileSystem 接口
class InMemoryFS implements FileSystem {
  files: Record<string, string>;
  constructor(files: Record<string, string>) {
    this.files = { ...files };
  }
  async readFile(path: string): Promise<string> {
    return this.files[path] ?? '';
  }
  async writeFile(path: string, content: string): Promise<void> {
    this.files[path] = content;
  }
  async listFiles(_patterns: string[]): Promise<string[]> {
    // 忽略模式，仅返回所有已知文件
    return Object.keys(this.files);
  }
  watchFiles(_callback: (path: string) => void): void {}
}

describe('SearchEngine', () => {
  const files = {
    'file1.txt': 'foo bar foo',
    'file2.txt': 'no matches here',
  };
  const fs = new InMemoryFS(files);
  const engine = new SearchEngine(fs);
  const options: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includePattern: ['*.txt'],
    excludePattern: [],
    maxResults: undefined,
    contextLines: { before: 1, after: 1 },
    searchInResults: false,
    respectGitIgnore: false,
  };

  it('should find all matches', async () => {
    const results = await engine.search('foo', '', options);
    expect(results).toHaveLength(1);
    const [res] = results;
    expect(res.filePath).toBe('file1.txt');
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
    const searchResults = await engine.search('bar', '', options);
    const replaceOptions: ReplaceOptions = { preview: false, selectedOnly: false };
    await engine.replace(searchResults, 'qux', replaceOptions);
    expect(fs.files['file1.txt']).toBe('foo qux foo');
    await engine.undoReplace();
    expect(fs.files['file1.txt']).toBe('foo bar foo');
  });
});
