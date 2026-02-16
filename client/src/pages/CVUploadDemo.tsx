import React, { useState } from 'react';
import CVUpload from '../components/CVUpload';

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
  signedUrl?: string;
}

const CVUploadDemo: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleUploadSuccess = (fileData: UploadedFile) => {
    console.log('File uploaded successfully:', fileData);
    setUploadedFiles((prev) => [...prev, fileData]);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px', color: '#2d3748' }}>
        CV Upload
      </h1>
      <p style={{ textAlign: 'center', color: '#718096', marginBottom: '40px' }}>
        Upload your CV or resume to get started
      </p>

      <CVUpload
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />

      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2d3748' }}>
            Uploaded Files
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#f7fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#2d3748' }}>
                      {file.originalName}
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', color: '#718096' }}>
                      Size: {formatFileSize(file.fileSize)} • Type: {file.mimeType}
                    </p>
                  </div>
                  {file.signedUrl && (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4299e1',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVUploadDemo;
