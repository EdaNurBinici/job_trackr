import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import axios from 'axios';

interface CVUploadProps {
  onUploadSuccess?: (fileData: UploadedFile) => void;
  onUploadError?: (error: string) => void;
}

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
  signedUrl?: string;
}

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const CVUpload: React.FC<CVUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return 'Invalid file type. Only PDF, DOCX, PNG, and JPG files are allowed.';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) {
        onUploadError(validationError);
      }
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<{ data: UploadedFile }>(
        '/api/cv/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      setSuccess(`File "${file.name}" uploaded successfully!`);
      setUploadProgress(100);
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data.data);
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to upload file. Please try again.';
      setError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="cv-upload-container">
      <div
        className={`cv-upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        <div className="cv-upload-content">
          {isUploading ? (
            <>
              <div className="upload-icon">📤</div>
              <p className="upload-text">Uploading...</p>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="upload-icon">📁</div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">
                PDF, DOCX, PNG, or JPG (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="cv-upload-message error">
          <span className="message-icon">❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="cv-upload-message success">
          <span className="message-icon">✅</span>
          <span>{success}</span>
        </div>
      )}

      <style>{`
        .cv-upload-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .cv-upload-dropzone {
          border: 2px dashed #cbd5e0;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #f7fafc;
        }

        .cv-upload-dropzone:hover {
          border-color: #4299e1;
          background-color: #ebf8ff;
        }

        .cv-upload-dropzone.dragging {
          border-color: #4299e1;
          background-color: #ebf8ff;
          transform: scale(1.02);
        }

        .cv-upload-dropzone.uploading {
          cursor: not-allowed;
          opacity: 0.8;
        }

        .cv-upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          font-size: 48px;
        }

        .upload-text {
          margin: 0;
          font-size: 16px;
          color: #2d3748;
        }

        .upload-text strong {
          color: #4299e1;
        }

        .upload-hint {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        .progress-bar-container {
          width: 100%;
          max-width: 400px;
          height: 30px;
          background-color: #e2e8f0;
          border-radius: 15px;
          overflow: hidden;
          margin-top: 8px;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
          transition: width 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
        }

        .progress-text {
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .cv-upload-message {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .cv-upload-message.error {
          background-color: #fff5f5;
          border: 1px solid #fc8181;
          color: #c53030;
        }

        .cv-upload-message.success {
          background-color: #f0fff4;
          border: 1px solid #68d391;
          color: #2f855a;
        }

        .message-icon {
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default CVUpload;
