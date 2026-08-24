import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { ApiResponse } from '../utils/ApiResponse';
import fs from 'fs';
import { StorageFactory } from '../services/storage/StorageFactory';

export class DocumentController {
  /**
   * Handle PDF upload and trigger background processing
   */
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      const userId = (req as any).user.id;

      if (!file) {
        return res.status(400).json(ApiResponse.error('No file uploaded or invalid file type', 'BAD_REQUEST'));
      }

      // Upload to abstract storage
      const storageService = StorageFactory.getService();
      const storageKey = `documents/${userId}/${file.filename}`;
      await storageService.uploadFile(file.path, storageKey);

      // Clean up local temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Create DB Record
      const document = await DocumentService.createDocumentRecord(
        userId,
        file.originalname,
        storageKey,
        file.size
      );

      // Fire and forget background processing
      DocumentService.processDocument(document.id, storageKey).catch(err => {
        console.error('Background processing failed:', err);
      });

      return res.status(202).json(ApiResponse.success(document, 'Document uploaded and processing started'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all documents for the user
   */
  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const documents = await DocumentService.getUserDocuments(userId);
      return res.status(200).json(ApiResponse.success(documents, 'Documents retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream a document's physical file
   */
  static async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      
      const document = await DocumentService.getDocumentById(userId, id);
      const metadata = document.metadata as { savedFilename?: string; storageKey?: string };

      // Backward compatibility for existing local files
      const storageKey = metadata.storageKey || metadata.savedFilename;

      if (!storageKey) {
        return res.status(404).json(ApiResponse.error('File metadata missing', 'NOT_FOUND'));
      }

      // We no longer rely on FileStorageService directly for download.
      const storageService = StorageFactory.getService();
      
      try {
        const readStream = await storageService.getReadStream(storageKey);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
        readStream.pipe(res);
      } catch (err) {
        return res.status(404).json(ApiResponse.error('Physical file not found in storage', 'NOT_FOUND'));
      }
    } catch (error: any) {
      if (error.message === 'Document not found') {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }

  /**
   * Get specific document status/details
   */
  static async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      
      const document = await DocumentService.getDocumentById(userId, id);
      return res.status(200).json(ApiResponse.success(document, 'Document retrieved successfully'));
    } catch (error: any) {
      if (error.message === 'Document not found') {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      
      await DocumentService.deleteDocument(userId, id);
      return res.status(200).json(ApiResponse.success(null, 'Document deleted successfully'));
    } catch (error: any) {
      if (error.message === 'Document not found') {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }
}
