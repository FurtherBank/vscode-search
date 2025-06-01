import { promises as fsPromises } from 'fs';
import { SearchEngine, FileSystem, } from '@cpu-search/core';
import { SearchOptions, ReplaceOptions } from '@cpu-search/core/types';

class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return fsPromises.readFile(path, 'utf8');
  }
  async writeFile(path: string, content: string): Promise<void> {
    await fsPromises.writeFile(path, content, 'utf8');
  }
  listFiles(patterns: string[]): Promise<string[]> {
    return Promise.reject(new Error('listFiles not implemented'));
  }
  watchFiles(callback: (path: string) => void): void {
    throw new Error('watchFiles not implemented');
  }
}

/**
 * 生成搜索报告
 */
export async function generateReport(params: {
  searchPattern: string;
  rootPath: string;
  options: SearchOptions;
}): Promise<string> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(params.searchPattern, params.rootPath, params.options);
  return engine.generateReport(results, params.rootPath);
}

/**
 * 搜索并替换
 */
export async function searchAndReplace(params: {
  searchPattern: string;
  replaceText: string;
  rootPath: string;
  options: SearchOptions;
  replaceOptions: ReplaceOptions;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  const results = await engine.search(params.searchPattern, params.rootPath, params.options);
  await engine.replace(results, params.replaceText, params.replaceOptions);
}

/**
 * 应用报告修改到文件
 */
export async function applyReportChange(params: {
  reportText: string;
  rootPath: string;
}): Promise<void> {
  const fs = new NodeFileSystem();
  const engine = new SearchEngine(fs);
  await engine.applyReportChange(params.reportText, params.rootPath);
}
