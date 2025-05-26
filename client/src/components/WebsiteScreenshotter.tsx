import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface ScreenshotProgress {
  type: 'start' | 'progress' | 'page_complete' | 'complete' | 'error';
  message?: string;
  domain?: string;
  path?: string;
  pagesProcessed?: number;
  pagesRemaining?: number;
  screenshotCount?: number;
  totalScreenshots?: number;
  totalPages?: number;
  error?: string;
}

const WebsiteScreenshotter = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ScreenshotProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [clientUrl, setClientUrl] = useState('');
  const [completedPages, setCompletedPages] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Set API URL on component mount
  useEffect(() => {
    const envApiUrl = import.meta.env.VITE_API_URL || '';
    setApiUrl(envApiUrl.trim());
    
    const envClientUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';
    setClientUrl(envClientUrl.trim());
    
    // Clean up event source on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const validateUrl = (inputUrl: string): boolean => {
    try {
      new URL(inputUrl);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }
    
    setIsProcessing(true);
    setProgress(null);
    setError(null);
    setCompletedPages([]);
    
    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Create URL with the website URL as a query parameter
      const endpoint = `${apiUrl}/api/website-screenshots?url=${encodeURIComponent(url)}`;
      
      // Set up server-sent events for real-time updates
      const eventSource = new EventSource(endpoint);
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ScreenshotProgress;
          setProgress(data);
          
          // Add completed page to list
          if (data.type === 'page_complete' && data.path) {
            setCompletedPages(prev => [...prev, data.path]);
          }
          
          // Close connection when complete or on error
          if (data.type === 'complete' || data.type === 'error') {
            eventSource.close();
            setIsProcessing(false);
            
            if (data.type === 'error') {
              setError(data.message || 'An error occurred during the screenshot process');
            }
          }
        } catch (err) {
          console.error('Error parsing event data:', err);
        }
      };
      
      eventSource.onerror = () => {
        console.error('EventSource failed');
        eventSource.close();
        setIsProcessing(false);
        setError('Connection to server failed. Please try again.');
      };
      
    } catch (error) {
      setIsProcessing(false);
      setError('Failed to start screenshot process. Please try again.');
      console.error('Error starting screenshot process:', error);
    }
  };

  const resetForm = () => {
    // Close event source if active
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setUrl('');
    setProgress(null);
    setError(null);
    setIsProcessing(false);
    setCompletedPages([]);
  };

  // Generate path to screenshots folder
  const getScreenshotsPath = () => {
    if (!progress?.domain) return null;
    return `${clientUrl}/screenshot_website/${progress.domain}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Website Screenshots Generator</h2>
      
      {/* Display API connection status for debugging */}
      <div className="mb-4 text-xs text-gray-500">
        API URL: {apiUrl || 'Not configured'}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter the full URL of the website you want to capture (including https://)
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {/* Progress information */}
        {progress && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="font-medium text-blue-700">
              {progress.type === 'start' && 'Starting screenshot process...'}
              {progress.type === 'progress' && 'Processing website pages...'}
              {progress.type === 'complete' && 'Screenshot process complete!'}
            </h3>
            
            {progress.message && (
              <p className="mt-2 text-blue-600">{progress.message}</p>
            )}
            
            {progress.type === 'progress' && progress.pagesProcessed !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (progress.pagesProcessed / (progress.pagesProcessed + (progress.pagesRemaining || 0))) * 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Processed {progress.pagesProcessed} pages
                  {progress.pagesRemaining !== undefined && ` (${progress.pagesRemaining} remaining)`}
                </p>
              </div>
            )}
            
            {progress.type === 'complete' && progress.domain && (
              <div className="mt-4">
                <p className="text-green-600">
                  Successfully captured {progress.totalScreenshots} screenshots across {progress.totalPages} pages.
                </p>
                <p className="mt-2">
                  <a 
                    href={getScreenshotsPath() || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View screenshots folder
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Recently completed pages */}
        {completedPages.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recently processed pages:</h3>
            <ul className="text-sm text-gray-600 list-disc pl-5 max-h-40 overflow-y-auto">
              {completedPages.slice(-5).map((page, index) => (
                <li key={index}>{page}</li>
              ))}
            </ul>
            {completedPages.length > 5 && (
              <p className="text-xs text-gray-500 mt-1">
                ...and {completedPages.length - 5} more
              </p>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isProcessing || !url}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Take Screenshots'}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteScreenshotter; 