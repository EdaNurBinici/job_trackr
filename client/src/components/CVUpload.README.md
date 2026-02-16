# CVUpload Component

A reusable React component for uploading CV files with drag-and-drop support, progress tracking, and comprehensive validation.

## Features

- ✅ **File Input**: Click to select files from your device
- ✅ **Drag & Drop**: Drag files directly onto the upload area
- ✅ **Upload Progress**: Real-time progress bar showing upload percentage
- ✅ **File Size Validation**: Enforces 10MB maximum file size
- ✅ **File Type Validation**: Accepts PDF, DOCX, PNG, and JPG files
- ✅ **Error Handling**: Clear error messages for validation failures
- ✅ **Success Feedback**: Confirmation message with uploaded file info
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **Visual Feedback**: Hover and drag states for better UX

## Requirements Validation

This component satisfies the following requirements:

- **Requirement 1.1**: CV files can be uploaded to AWS S3
- **Requirement 2.3**: File size limit (max 10MB) is enforced
- **Requirement 2.4**: Supported formats (PDF, DOCX, PNG, JPG) are validated

## Usage

### Basic Usage

```tsx
import CVUpload from './components/CVUpload';

function MyPage() {
  return <CVUpload />;
}
```

### With Callbacks

```tsx
import CVUpload from './components/CVUpload';

function MyPage() {
  const handleSuccess = (fileData) => {
    console.log('File uploaded:', fileData);
    // Handle successful upload
  };

  const handleError = (error) => {
    console.error('Upload failed:', error);
    // Handle upload error
  };

  return (
    <CVUpload
      onUploadSuccess={handleSuccess}
      onUploadError={handleError}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onUploadSuccess` | `(fileData: UploadedFile) => void` | No | Callback fired when upload succeeds |
| `onUploadError` | `(error: string) => void` | No | Callback fired when upload fails |

## UploadedFile Type

```typescript
interface UploadedFile {
  id: string;           // Unique file identifier
  fileName: string;     // Stored file name
  originalName: string; // Original file name
  s3Key: string;        // S3 storage key
  fileSize: number;     // File size in bytes
  mimeType: string;     // MIME type
  signedUrl?: string;   // Temporary download URL
}
```

## Validation Rules

### File Size
- Maximum: 10MB (10,485,760 bytes)
- Error message includes actual file size

### File Types
Accepted MIME types:
- `application/pdf` (.pdf)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `image/png` (.png)
- `image/jpeg` (.jpg, .jpeg)

## API Integration

The component calls the following endpoint:

```
POST /api/cv/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body: FormData with 'file' field
```

Expected response:
```json
{
  "data": {
    "id": "uuid",
    "fileName": "stored-name.pdf",
    "originalName": "my-cv.pdf",
    "s3Key": "user-id/timestamp-filename.pdf",
    "fileSize": 1234567,
    "mimeType": "application/pdf",
    "signedUrl": "https://s3.amazonaws.com/..."
  }
}
```

## Styling

The component includes inline styles for:
- Upload dropzone with hover effects
- Drag-and-drop visual feedback
- Progress bar with gradient
- Success/error message styling

All styles are scoped to the component and won't affect other elements.

## Error Handling

The component handles the following error scenarios:

1. **File too large**: Shows size limit and actual file size
2. **Invalid file type**: Lists allowed formats
3. **Network errors**: Shows generic upload failure message
4. **Server errors**: Displays error message from API response

## Accessibility

- Keyboard accessible (click to open file dialog)
- Clear visual feedback for all states
- Descriptive error messages
- Progress indication for screen readers

## Browser Compatibility

- Modern browsers with File API support
- Drag-and-drop API support
- FormData API support

## Example Integration

See `client/src/pages/CVUploadDemo.tsx` for a complete example with:
- Upload success handling
- File list display
- Download links
- File size formatting

## Testing

To test the component:

1. **Valid upload**: Upload a PDF file under 10MB
2. **Size validation**: Try uploading a file over 10MB
3. **Type validation**: Try uploading an unsupported file type (e.g., .txt)
4. **Drag & drop**: Drag a file onto the upload area
5. **Progress tracking**: Watch the progress bar during upload
6. **Error recovery**: Upload a valid file after an error

## Notes

- JWT token must be present in localStorage
- Backend endpoint must be running at `http://localhost:3001`
- S3 bucket must be configured on the backend
- Signed URLs expire after 1 hour (backend configuration)
