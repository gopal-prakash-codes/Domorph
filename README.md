# Domorph - Screenshot to Website Code Generator

Domorph is a powerful tool that converts website screenshots into functional HTML and Tailwind CSS code using AI. It now supports both single-page and multi-page website generation.

## Features

- **Single Page Mode**: Upload a single screenshot to generate a complete website page.
- **Multi-Page Mode**: Upload multiple screenshots to generate a complete multi-page website.
- **Real-time Progress Updates**: Track the generation process with detailed status updates for each page.
- **Website Modification**: Use natural language to request modifications to your generated website.
- **Responsive Design**: All generated websites are responsive and work on all device sizes.

## How It Works

### Single Page Mode

1. Enter a domain name for your website
2. Upload a screenshot of any website design you want to recreate
3. Click "Convert to Code" to generate the HTML and CSS
4. View your generated website and make modifications as needed

### Multi-Page Mode

1. Enter a domain name for your website
2. Upload multiple screenshots, with filenames corresponding to the pages you want to create:
   - `index.png` → Will create the homepage (index.html)
   - `about.png` → Will create about.html
   - `contact.png` → Will create contact.html
   - etc.
3. Click "Generate Multi-Page Website" to start the process
4. Track real-time progress as each page is generated
5. Once complete, view your multi-page website and navigate between pages

## Implementation Details

The system uses:
- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express
- **AI**: Vercel's v0 API for image-to-code generation

### Multi-Page Implementation

The multi-page website generator:
1. Processes each screenshot sequentially
2. Uses Server-Sent Events (SSE) to provide real-time progress updates
3. Creates HTML files with names matching the screenshot filenames
4. Organizes all pages under a single domain folder
5. Provides a unified view of the complete website when finished

## Setup and Configuration

### Environment Variables

Create a `.env` file in the server directory with:

```
PORT=3000
V0_API_KEY=your_v0_api_key_here
WEBSITE_DIR=scraped_website
CLIENT_DIR_PATH=/path/to/client/public
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   # Server
   cd server
   npm install
   
   # Client
   cd ../client
   npm install
   ```
3. Start the development servers:
   ```
   # Server
   cd server
   npm run dev
   
   # Client
   cd ../client
   npm run dev
   ```

## Usage Tips

- For best results, use high-quality screenshots with clear, readable elements
- When creating multi-page websites, name your screenshot files according to the pages you want to create
- For complex websites, consider breaking them down into separate pages rather than one long page
- After generation, you can use the website modifier to make further changes with natural language instructions 