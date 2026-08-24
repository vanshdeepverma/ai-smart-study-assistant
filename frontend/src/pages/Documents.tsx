import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/Button";
import { UploadCloud, File, MoreVertical, Trash, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";

export function Documents() {
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const [uploadError, setUploadError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadError('');
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit');
      return;
    }

    uploadMutation.mutate(file, {
      onError: (err: any) => setUploadError(err.message)
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage your uploaded PDFs and notes.</p>
        </div>
      </div>

      {uploadError && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {uploadError}
        </div>
      )}

      {/* Upload Dropzone */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:bg-muted/50'
        } ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          {uploadMutation.isPending ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <UploadCloud className={`h-10 w-10 ${isDragActive ? 'text-primary' : ''}`} />
          )}
          <p className="font-medium text-foreground">
            {uploadMutation.isPending ? 'Uploading...' : 
             isDragActive ? 'Drop the PDF here' : 
             'Click or drag to upload a PDF'}
          </p>
          <p className="text-sm">Maximum file size 10MB</p>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <div className="p-4 border-b bg-muted/50 font-medium grid grid-cols-12 gap-4 text-sm">
          <div className="col-span-6">Name</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 flex justify-center text-muted-foreground">Loading documents...</div>
          ) : documents?.length === 0 ? (
            <div className="p-8 flex justify-center text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            documents?.map((doc) => (
              <div key={doc.id} className="p-4 grid grid-cols-12 gap-4 items-center text-sm hover:bg-muted/50 transition-colors">
                <div className="col-span-6 flex items-center gap-3">
                  <File className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate" title={doc.filename}>{doc.filename}</span>
                </div>
                <div className="col-span-2 text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-2 text-muted-foreground flex flex-col">
                  <span>{formatSize(doc.metadata.size)}</span>
                  {doc.status === 'PROCESSING' && (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processing
                    </span>
                  )}
                  {doc.status === 'READY' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  )}
                  {doc.status === 'ERROR' && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Failed
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if(confirm('Are you sure you want to delete this document?')) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
