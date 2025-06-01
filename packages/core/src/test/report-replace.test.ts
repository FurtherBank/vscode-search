import { SearchEngine, FileSystem } from '../index.js';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DiskFS } from './utils/diskfs.js';

describe('SearchEngine applyReportChange', () => {
  let fs: FileSystem;
  let engine: SearchEngine;
  let root: string;
  let tempDir: string;

  beforeAll(async () => {
    const casesDir = path.join(__dirname, 'cases/report');
    tempDir = path.join(os.tmpdir(), 'vscode-search-cases-report-replace');
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

  it('should apply report changes and save modified files to target-replace folder', async () => {
    const reportText = await fsPromises.readFile(
      path.join(root, 'result-target-replace.txt'),
      'utf8'
    );
    await engine.applyReportChange(reportText, root);

    const targetDir = path.join(root, 'target-replace');
    await fsPromises.rm(targetDir, { recursive: true, force: true });
    await fsPromises.mkdir(targetDir, { recursive: true });
    await fsPromises.cp(path.join(root, 'src'), targetDir, { recursive: true });

    // 验证示例文件被正确修改
    const modifiedFile = path.join(root, 'src/components/base/ReactG6.tsx');
    const content = await fsPromises.readFile(modifiedFile, 'utf8');
    const lines = content.split(/\r?\n/);
    expect(lines[4].trim()).toBe('哈哈哈哈哈');
  });
});
