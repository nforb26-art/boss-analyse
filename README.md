# Chart Analyzer Setup Guide

## Overview
This is a full-stack web application that allows you to upload trading charts and get AI-powered analysis from Claude AI and DeepSeek. The system will provide:
- Entry points
- Stop loss levels
- Take profit targets

## Project Structure
```
├── server.js              # Express backend server
├── package.json          # Node.js dependencies
├── .env                  # Environment variables (API keys)
├── .gitignore           # Git ignore file
├── README.md            # This file
└── public/
    ├── index.html       # Home page
    └── analyzer.html    # Chart upload & analysis page
```

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- API keys from:
  - **Claude AI**: https://console.anthropic.com/
  - **DeepSeek**: https://platform.deepseek.com/

## Installation Steps

### 1. Get API Keys

#### Claude API Key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy and save it

#### DeepSeek API Key
1. Go to https://platform.deepseek.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy and save it

### 2. Configure Environment Variables
Edit the `.env` file in the project root:

```env
CLAUDE_API_KEY=your_claude_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
```

Replace with your actual API keys.

### 3. Install Dependencies
```bash
npm install
```

This will install:
- **express**: Web framework
- **multer**: File upload handling
- **axios**: HTTP client for API calls
- **dotenv**: Environment variable management
- **form-data**: Multipart form handling

### 4. Start the Server

**For Development:**
```bash
npm install --save-dev nodemon
npm run dev
```

**For Production:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## Usage

### 1. Open the Application
Navigate to `http://localhost:3000` in your browser.

### 2. Go to Chart Analyzer
Click "Open Chart Analyzer" or navigate to `http://localhost:3000/analyzer`

### 3. Upload a Chart
- Drag and drop a chart image, or
- Click the upload button and select an image

Supported formats: PNG, JPG, GIF, WebP, etc. (Max 10MB)

### 4. View Results
Once uploaded, you'll see:
- **Combined Analysis**: Entry point, stop loss, take profit from both AIs
- **Claude AI Analysis**: Individual Claude assessment
- **DeepSeek Analysis**: Individual DeepSeek assessment
- **Confidence Ratings**: How confident each AI is in its analysis

## API Endpoints

### POST /api/analyze-chart
Analyzes a chart image using both Claude and DeepSeek.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form with `chart` file field

**Response:**
```json
{
  "claude": {
    "entryPoint": "12450",
    "stopLoss": "12350",
    "takeProfit": "12650",
    "analysis": "...",
    "confidence": "High"
  },
  "deepseek": {
    "entryPoint": "12445",
    "stopLoss": "12345",
    "takeProfit": "12655",
    "analysis": "...",
    "confidence": "High"
  },
  "combined": {
    "entryPoint": "12450 - 12445",
    "stopLoss": "12350 - 12345",
    "takeProfit": "12650 - 12655",
    "analysis": "...",
    "confidence": "High"
  }
}
```

### GET /analyzer
Serves the chart analyzer page.

### GET /
Serves the home page.

## Troubleshooting

### API Key Errors
- **Issue**: "API key invalid" or "Unauthorized"
- **Solution**: Check that your API keys are correct in `.env` file and that the services are active

### File Upload Errors
- **Issue**: "Only image files are allowed"
- **Solution**: Upload a valid image file (PNG, JPG, GIF, etc.)

### Port Already in Use
- **Issue**: "EADDRINUSE: address already in use :::3000"
- **Solution**: 
  - Change the PORT in `.env` to a different number, or
  - Kill the process using port 3000

### Network Errors
- **Issue**: "Cannot reach Claude/DeepSeek API"
- **Solution**: 
  - Check your internet connection
  - Verify API keys are correct
  - Check if the services are up (visit their websites)

## Customization

### Modify Analysis Prompt
Edit the prompt in `server.js` in the `analyzeWithClaude()` and `analyzeWithDeepseek()` functions to change what analysis is requested.

### Change Maximum File Size
In `server.js`, modify the `limits.fileSize` in the multer configuration:
```javascript
limits: { fileSize: 20 * 1024 * 1024 } // 20MB instead of 10MB
```

### Customize UI
Edit `public/analyzer.html` and `public/index.html` to change colors, layout, or functionality.

## Performance Notes
- Analysis typically takes 5-15 seconds depending on API response times
- Both AI services are called in parallel for faster results
- Uploaded files are automatically deleted after analysis

## Security Considerations
- Never commit the `.env` file with real API keys to version control
- Add `.env` to `.gitignore` (already included in template)
- API keys should be rotated regularly
- Consider rate limiting in production

## Support
If you encounter issues:
1. Check the console for error messages
2. Verify API keys are correct
3. Ensure Node.js and npm are properly installed
4. Check internet connection
5. Review the troubleshooting section above

## License
This project is open source and available for personal use.
