import { Router, Request } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { DocumentController } from '../controllers/document.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(process.cwd(), 'tmp');
    import('fs').then(fs => {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      cb(null, tmpDir);
    });
  },
  filename: (_req, file, cb) => {
    // Generate UUID filename to prevent traversal and overwrite attacks
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    // Pass an error if the file is not a PDF
    cb(new Error('Only PDF files are allowed'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Wrap multer to format error nicely
const uploadMiddleware = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json(ApiResponse.error(`Upload error: ${err.message}`, 'BAD_REQUEST'));
    } else if (err) {
      return res.status(400).json(ApiResponse.error(err.message, 'BAD_REQUEST'));
    }
    next();
  });
};

// All document routes strictly require authentication
router.use(requireAuth);

router.post('/', uploadMiddleware, DocumentController.uploadDocument);
router.get('/', DocumentController.listDocuments);
router.get('/:id', DocumentController.getDocument);
router.get('/:id/file', DocumentController.downloadDocument);
router.delete('/:id', DocumentController.deleteDocument);

export default router;
