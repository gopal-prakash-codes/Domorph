import { useState } from 'react';
import axios from 'axios';

interface ModifyResult {
  success: boolean;
  message: string;
  url?: string;
  code?: string;
  error?: string;
}

interface WebsiteModifierProps {
  domainName: string;
  apiUrl: string;
  clientUrl: string;
  onModified?: (result: ModifyResult) => void;
}

const WebsiteModifier = ({ domainName, apiUrl, clientUrl, onModified }: WebsiteModifierProps) => {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ModifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstruction(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName) {
      setError('Domain name is required');
      return;
    }
    
    if (!instruction) {
      setError('Please enter modification instructions');
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const url = `${apiUrl}/api/screenshot/modify`;
      console.log(`Sending modification request to: ${url}`);
      
      const response = await axios.post(
        url,
        {
          domainName,
          instruction
        }
      );
      
      console.log('Modification response:', response.data);
      
      const modifyResult = response.data as ModifyResult;
      setResult(modifyResult);
      
      // Call the callback if provided
      if (onModified) {
        onModified(modifyResult);
      }
    } catch (error) {
      console.error('Error modifying website:', error);
      
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

  // Generate the correct client-side URL for viewing the website
  const getViewUrl = (serverUrl: string) => {
    // Extract the domain name from the URL or use the current domain name
    const urlPath = serverUrl.split('/').slice(3).join('/');
    const domain = urlPath.split('/')[1] || domainName;
    
    return `${clientUrl}/scraped_website/${domain}/index.html`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Modify Your Website</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="instruction" className="block text-sm font-medium text-gray-700 mb-1">
            What would you like to change?
          </label>
          <textarea
            id="instruction"
            value={instruction}
            onChange={handleInstructionChange}
            placeholder="e.g., Change the background color to blue, add a contact form at the bottom, make the header sticky, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Describe in natural language what changes you'd like to make to your website
          </p>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Modifying...' : 'Apply Changes'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="mt-4 p-4 border border-gray-300 rounded-md bg-gray-50">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Applying your changes... This may take a moment.</p>
          </div>
        </div>
      )}
      
      {result && (
        <div className={`mt-4 p-4 border rounded-md ${result?.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <h3 className={`font-semibold ${result?.success ? 'text-green-700' : 'text-red-700'}`}>
            {result?.success ? 'Changes Applied Successfully!' : 'Modification Failed'}
          </h3>
          <p className="mt-2">{result?.message}</p>
          
          {result?.success && result?.url && (
            <div className="mt-4 flex flex-wrap gap-3">
              <a 
                href={getViewUrl(result.url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white py-2 px-5 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold transition-all"
              >
                View Updated Website
              </a>
            </div>
          )}
        </div>
      )}
      
      {error && !result && (
        <div className="mt-4 p-4 border border-red-300 rounded-md bg-red-50">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default WebsiteModifier; 