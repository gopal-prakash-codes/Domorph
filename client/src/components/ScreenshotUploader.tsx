import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import WebsiteModifier from './WebsiteModifier';
import MultiPageScreenshotUploader from './MultiPageScreenshotUploader';

interface UploadResult {
  success: boolean;
  message: string;
  code?: string;
  url?: string;
  error?: string;
}

const ScreenshotUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [domainName, setDomainName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [clientUrl, setClientUrl] = useState('');
  const [showModifier, setShowModifier] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set API URL on component mount, handling any spaces in the env variable
  useEffect(() => {
    const envApiUrl = import.meta.env.VITE_API_URL || '';
    console.log('Raw API URL from env:', envApiUrl);
    // Trim any spaces that might be in the env variable
    setApiUrl(envApiUrl.trim());
    
    // Set client URL for generated website viewing
    const envClientUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';
    setClientUrl(envClientUrl.trim());
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPEG, etc.)');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setFile(selectedFile);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters and hyphens
    const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setDomainName(sanitizedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a screenshot file');
      return;
    }
    
    if (!domainName) {
      setError('Please enter a domain name');
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    const formData = new FormData();
    formData.append('screenshot', file);
    
    try {
      // Use the trimmed API URL
      const url = `${apiUrl}/api/screenshot/convert?domainName=${domainName}`;
      console.log(`Sending request to: ${url}`);
      
      const response = await axios.post(
        url,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('Response:', response.data);
      console.log("Code: ", response.data.code);
      
      setResult(response.data);
      
      // Show the modifier if generation was successful
      if (response.data.success) {
        setShowModifier(true);
      }
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        // Server responded with an error
        const errorMessage = error.response.data?.message || error.message;
        setError(errorMessage);
        setResult({
          success: false,
          message: errorMessage,
        });
      } else {
        // Network error or other issue
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        setResult({
          success: false,
          message: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowModifier(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show connection status for debugging
  const connectionStatus = () => {
    if (!apiUrl) return 'No API URL configured';
    return `API URL: ${apiUrl}`;
  };

  // Generate the correct client-side URL for viewing the website
  const getViewUrl = (serverUrl: string) => {
    // Extract the domain name from the URL or use the current domain name
    const urlPath = serverUrl.split('/').slice(3).join('/');
    const domain = urlPath.split('/')[1] || domainName;
    
    return `${clientUrl}/scraped_website/${domain}/index.html`;
  };

  // Handle successful modification
  const handleModificationSuccess = (modifyResult: any) => {
    // Update the result with the new data
    setResult({
      ...result!,
      ...modifyResult
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Convert Website Screenshots to Code</h2>
      
      {/* Display API connection status for debugging */}
      <div className="mb-4 text-xs text-gray-500">
        {connectionStatus()}
      </div>
      
      {/* Tabs for Single Page and Multi-Page modes */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('single')}
            className={`mr-4 py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Single Page
          </button>
          <button
            onClick={() => setActiveTab('multi')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'multi'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Multi-Page Website
          </button>
        </nav>
      </div>
      
      {activeTab === 'single' ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Domain Name
              </label>
              <input
                type="text"
                id="domain"
                value={domainName}
                onChange={handleDomainChange}
                placeholder="mywebsite"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                This will be used to organize your generated website files (alphanumeric and hyphens only)
              </p>
            </div>
            
            <div>
              <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-1">
                Website Screenshot
              </label>
              <input
                type="file"
                id="screenshot"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload a screenshot of the website you want to recreate (PNG or JPEG, max 10MB)
              </p>
            </div>
            
           
            
            {/* Always show the buttons section */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Converting...' : 'Convert to Code'}
              </button>
              
              {/* Only show reset if there's something to reset */}
              {(file || preview || result) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
          
          {loading && (
            <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Processing your screenshot... This may take a few moments.</p>
              </div>
            </div>
          )}
          
          {result && (
            <div className={`mt-6 p-4 border rounded-md ${result?.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <h3 className={`font-semibold ${result?.success ? 'text-green-700' : 'text-red-700'}`}>
                {result?.success ? 'Conversion Successful!' : 'Conversion Failed'}
              </h3>
              <p className="mt-2">{result?.message}</p>
              
              {result?.success && result?.url && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <a 
                    href={getViewUrl(result.url!)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white py-2 px-5 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold transition-all"
                  >
                    View Generated Website
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Show WebsiteModifier component if we have a successful result */}
          {showModifier && result?.success && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <WebsiteModifier 
                domainName={domainName}
                apiUrl={apiUrl}
                clientUrl={clientUrl}
                onModified={handleModificationSuccess}
              />
            </div>
          )}
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-2">How It Works</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Upload a screenshot of any website design you like</li>
              <li>Our AI analyzes the image and generates HTML and Tailwind CSS code</li>
              <li>The generated code is saved to your project folder</li>
              <li>You can view, edit, and customize the generated website as needed</li>
              <li>Use natural language to request modifications to your website</li>
            </ol>
          </div>
        </>
      ) : (
        <MultiPageScreenshotUploader />
      )}
    </div>
  );
};

export default ScreenshotUploader; 