import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { IStorageService } from './IStorageService';

export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.STORAGE_BUCKET || '';
    if (!this.bucket) {
      console.warn('STORAGE_BUCKET is not defined in environment variables.');
    }

    this.client = new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
      },
      // Force path style for S3-compatible providers like Supabase/MinIO
      forcePathStyle: !!process.env.STORAGE_ENDPOINT,
    });
  }

  async uploadFile(sourcePath: string, storageKey: string): Promise<string> {
    const fileStream = fs.createReadStream(sourcePath);
    
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: fileStream,
        // Depending on use case, we might want to guess Content-Type or assume PDF
        ContentType: 'application/pdf'
      })
    );
    return storageKey;
  }

  async downloadToTemp(storageKey: string): Promise<string> {
    const tempPath = path.join(process.cwd(), 'tmp', `s3-temp-${Date.now()}-${path.basename(storageKey)}`);
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }

    const { Body } = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      })
    );

    if (!Body || !(Body instanceof Readable)) {
      throw new Error(`Failed to read object from S3: ${storageKey}`);
    }

    const writeStream = fs.createWriteStream(tempPath);
    return new Promise((resolve, reject) => {
      Body.pipe(writeStream)
        .on('error', reject)
        .on('close', () => resolve(tempPath));
    });
  }

  async getReadStream(storageKey: string): Promise<Readable> {
    const { Body } = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      })
    );

    if (!Body || !(Body as any).pipe) {
      throw new Error(`Failed to create read stream from S3: ${storageKey}`);
    }

    return Body as Readable;
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        })
      );
    } catch (error) {
      console.error(`Failed to delete S3 file: ${storageKey}`, error);
    }
  }
}
