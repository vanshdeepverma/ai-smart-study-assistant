import { IStorageService } from './IStorageService';
import { LocalStorageService } from './LocalStorageService';
import { S3StorageService } from './S3StorageService';

export class StorageFactory {
  private static instance: IStorageService;

  static getService(): IStorageService {
    if (!this.instance) {
      const provider = process.env.STORAGE_PROVIDER?.toLowerCase();
      if (provider === 's3') {
        console.log('[StorageFactory] Initializing S3StorageService');
        this.instance = new S3StorageService();
      } else {
        console.log('[StorageFactory] Initializing LocalStorageService');
        this.instance = new LocalStorageService();
      }
    }
    return this.instance;
  }
}
