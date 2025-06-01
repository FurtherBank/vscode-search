import { promises as fsPromises } from 'fs';
import fg from 'fast-glob';
import type { FileSystem } from '../../index.js';

export class DiskFS implements FileSystem {
  root: string;
  constructor(root: string) {
    this.root = root;
  }
  async readFile(p: string): Promise<string> {
    return fsPromises.readFile(p, 'utf8');
  }
  async writeFile(p: string, content: string): Promise<void> {
    return fsPromises.writeFile(p, content, 'utf8');
  }
  async listFiles(patterns: string[]): Promise<string[]> {
    return fg(patterns, { cwd: this.root, absolute: true });
  }
  watchFiles(): void {}
}
