# CVList Component

A reusable React component that displays a list of the user's uploaded CV files with download and delete functionality.

## Features

- **Fetch and Display**: Automatically fetches and displays all CV files for the current user
- **File Information**: Shows file name, size, MIME type, and upload date for each CV
- **Download Button**: Provides a download button that uses signed URLs from the backend
- **Delete Button**: Provides a delete button with confirmation dialog
- **Loading State**: Shows a loading indicator while fetching CVs
- **Empty State**: Shows a friendly empty state when no CVs exist
- **Auto Refresh**: Refreshes the list after upload or delete operations
- **Error Handling**: Displays error messages when operations fail
- **Success Messages**: Shows success messages after successful operations

## Usage

### Basic Usage

```tsx
import CVList from '../components/CVList';

function MyPage() {
  return (
    <div>
      <h1>My CVs</h1>
      <CVList />
    </div>
  );
}
```

### With Refresh Trigger

```tsx
import { useState } from 'react';
import CVList from '../components/CVList';

function MyPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger refresh of CV list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <h1>My CVs</h1>
      <CVList refreshTrigger={refreshTrigger} />
    </div>
  );
}
```

### With Refresh Callback

```tsx
import CVList from '../components/CVList';

function MyPage() {
  const handleRefresh = () => {
    console.log('CV list refreshed');
  };

  return (
    <div>
      <h1>My CVs</h1>
      <CVList onRefresh={handleRefresh} />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onRefresh` | `() => void` | No | Callback function called after the list is refreshed |
| `refreshTrigger` | `number` | No | When this value changes, the component will refresh the CV list |

## API Requirements

The component expects the following API endpoints to be available:

- `GET /api/cv/user/list` - List all CVs for the authenticated user
- `GET /api/cv/:id` - Get CV details including signed URL for download
- `DELETE /api/cv/:id` - Delete a CV file

## Response Format

### List CVs Response

```json
{
  "data": [
    {
      "id": "uuid",
      "fileName": "my-cv.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get CV Response

```json
{
  "data": {
    "id": "uuid",
    "fileName": "my-cv.pdf",
    "signedUrl": "https://..."
  }
}
```

## Styling

The component uses inline styles for simplicity and portability. All styles are self-contained within the component.

## Localization

Currently, the component uses Turkish language strings. To localize:

1. Extract all text strings to a separate constants file
2. Use a localization library like `react-i18next`
3. Replace hardcoded strings with translation keys

## Requirements Validation

This component validates **Requirement 2.1** from the JobTrackr specification:
- Displays user's CV files
- Provides download functionality using signed URLs
- Provides delete functionality with confirmation
- Shows file metadata (name, size, upload date)
- Handles loading and empty states
- Refreshes after operations
