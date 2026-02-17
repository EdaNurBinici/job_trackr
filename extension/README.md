# JobTrackr Chrome Extension 🚀

Add job postings to JobTrackr with one click from LinkedIn, Kariyer.net, Indeed, and Secretcv!

## Features ✨

- 🎯 Auto-capture LinkedIn job postings
- 🎯 Auto-capture Kariyer.net job postings
- 💾 Save to JobTrackr with one click
- ⚡ Fast and easy to use
- 🔒 Secure token-based authentication

## Installation 📦

### 1. Load the Extension

1. Download this `extension/` folder to your computer
2. Open Chrome browser
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Select the `extension/` folder
7. Extension loaded! 🎉

### 2. Configure Settings

1. Click the extension icon
2. Click "⚙️ Settings" link
3. Enter the following information:

**API URL:**
```
http://localhost:3000
```

**Auth Token:**
To get your token:
1. Log in to JobTrackr (http://localhost:5173)
2. Open Developer Tools with F12
3. Go to Console
4. Type: `localStorage.getItem('token')`
5. Copy the token (without quotes)
6. Paste it in the settings page

4. Click "💾 Save"
5. Test with "🔍 Test Connection"

## Usage 📖

### Adding Jobs from LinkedIn

1. Go to a job posting on LinkedIn
   - Example: https://www.linkedin.com/jobs/view/123456789
2. Click the extension icon
3. Click "🎯 Capture Job"
4. Job details will be auto-extracted
5. Click "💾 Save to JobTrackr"
6. Success! ✅

### Adding Jobs from Kariyer.net

1. Go to a job posting on Kariyer.net
   - Example: https://www.kariyer.net/is-ilani/...
2. Click the extension icon
3. Click "🎯 Capture Job"
4. Job details will be auto-extracted
5. Click "💾 Save to JobTrackr"
6. Success! ✅

## Supported Sites 🌐

- ✅ LinkedIn Jobs (linkedin.com/jobs/*)
- ✅ Kariyer.net (kariyer.net/is-ilani/*)
- ✅ Indeed (tr.indeed.com/viewjob*, tr.indeed.com/jobs*)
- ✅ Secretcv (secretcv.com/ilan/*)

## Troubleshooting 🔧

### "This page is not supported" Error
- Make sure you're on a LinkedIn or Kariyer.net job posting page
- Wait for the page to fully load

### "Could not extract job details" Error
- Refresh the page (F5)
- Wait a few seconds and try again
- Try a different job posting on LinkedIn

### "Could not connect to API" Error
- Check that the API URL is correct in settings
- Make sure the backend is running (http://localhost:3000/health)
- Verify your token is valid

### "Invalid token" Error
- Log out and log back in to JobTrackr
- Get a new token and update settings

## Technical Details 🛠️

- **Manifest Version:** 3
- **Permissions:** activeTab, storage
- **Content Scripts:** For LinkedIn and Kariyer.net
- **API:** REST API (JWT authentication)

## Security 🔒

- Tokens are stored in Chrome's secure storage
- Communication over HTTPS (in production)
- Tokens are never logged

## Developer Notes 💻

Extension is written in pure vanilla JavaScript, no build required.

**File Structure:**
```
extension/
├── manifest.json       # Extension config
├── popup.html          # Popup UI
├── popup.css           # Popup styles
├── popup.js            # Popup logic
├── settings.html       # Settings page
├── settings.js         # Settings logic
├── icons/              # Extension icons
└── README.md           # This file
```

**Testing:**
```bash
# Start backend
npm run dev

# Start frontend
cd client && npm run dev

# Load extension in Chrome
# chrome://extensions/ → Load unpacked → extension/
```

## Version History 📝

### v1.0.0 (2026-02-12)
- ✨ Initial release
- ✅ LinkedIn support
- ✅ Kariyer.net support
- ✅ Quick-add API endpoint
- ✅ Settings page

## License 📄

MIT License

## Support 💬

Having issues? Open an issue on GitHub!

---

Made with ❤️ for JobTrackr
