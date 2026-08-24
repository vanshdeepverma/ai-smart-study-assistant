import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IStorageService } from './IStorageService';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolves a secure absolute path, preventing directory traversal.
   */
  private getSecurePath(storageKey: string): string {
    const safePath = path.resolve(this.baseDir, storageKey);
    if (!safePath.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Path traversal detected');
    }
    return safePath;
  }

  async uploadFile(sourcePath: string, storageKey: string): Promise<string> {
    const destPath = this.getSecurePath(storageKey);
    const destDir = path.dirname(destPath);
    
    if (!fs.existsSync(destDir)) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }

    // Move or copy file
    await fs.promises.copyFile(sourcePath, destPath);
    return storageKey;
  }

  async downloadToTemp(storageKey: string): Promise<string> {
    // In local storage, the file is already on local disk.
    // However, to strictly respect the interface (which expects a temp path that can be deleted),
    // we'll copy it to a new temp path so the caller can safely delete it.
    const sourcePath = this.getSecurePath(storageKey);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${storageKey}`);
    }

    const tempPath = path.join(process.cwd(), 'tmp', `local-temp-${Date.now()}-${path.basename(storageKey)}`);
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }
    
    await fs.promises.copyFile(sourcePath, tempPath);
    return tempPath;
  }

  async getReadStream(storageKey: string): Promise<Readable> {
    const sourcePath = this.getSecurePath(storageKey);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${storageKey}`);
    }
    return fs.createReadStream(sourcePath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const sourcePath = this.getSecurePath(storageKey);
      if (fs.existsSync(sourcePath)) {
        await fs.promises.unlink(sourcePath);
      }
    } catch (error) {
      console.error(`Failed to delete local file: ${storageKey}`, error);
    }
  }
}
