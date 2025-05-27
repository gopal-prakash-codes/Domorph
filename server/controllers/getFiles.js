import fs from 'fs';
import path from 'path';

export const getFiles = async (req, res) => {
    const rootPath = path.join(
        process.cwd(),
        "..",
        "client",
        "public",         
        "scraped_website"
    );
  
    fs.readdir(rootPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return res.status(500).json({ error: 'Failed to read directories' });
      }
  
      // Filter only directories
      const directories = files
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
  
      res.json({ directories });
    });
  }