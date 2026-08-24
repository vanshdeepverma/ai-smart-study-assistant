import { Readable } from 'stream';

export interface IStorageService {
  /**
   * Uploads a file from a local source path to the specified storage key.
   * @param sourcePath Absolute path to the temporary file on disk.
   * @param storageKey The safe destination path/key (e.g., documents/userId/docId/filename).
   * @returns The storage key or URL for reference.
   */
  uploadFile(sourcePath: string, storageKey: string): Promise<string>;

  /**
   * Downloads a file from storage to a temporary local path.
   * @param storageKey The key of the file to download.
   * @returns The absolute local path to the downloaded temporary file.
   */
  downloadToTemp(storageKey: string): Promise<string>;

  /**
   * Retrieves a read stream for the file to send back directly over HTTP.
   * @param storageKey The key of the file to stream.
   * @returns A Node.js Readable stream.
   */
  getReadStream(storageKey: string): Promise<Readable>;

  /**
   * Deletes a file from storage.
   * @param storageKey The key of the file to delete.
   */
  deleteFile(storageKey: string): Promise<void>;
}
