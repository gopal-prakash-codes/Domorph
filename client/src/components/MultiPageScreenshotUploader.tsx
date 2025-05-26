import { useState, useRef, useEffect } from 'react';
import WebsiteModifier from './WebsiteModifier';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface FileWithPreview extends File {
  preview?: string;
  id?: string; // Add unique ID for drag/drop ordering
}

interface UploadStatus {
  status: 'idle' | 'started' | 'processing' | 'completed' | 'error' | 'skipped' | 'finished';
  message: string;
  currentFile?: string;
  completedFiles?: Array<{
    name: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
  totalFiles?: number;
  pageUrl?: string;
  websiteUrl?: string;
}

// Draggable file item component
const DraggableFile = ({ file, index, moveFile }: { file: FileWithPreview, index: number, moveFile: (dragIndex: number, hoverIndex: number) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'FILE_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'FILE_ITEM',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;
      
      // Time to actually perform the action
      moveFile(dragIndex, hoverIndex);
      
      // Update the index for the dragged item
      item.index = hoverIndex;
    },
  });
  
  // Apply the ref to both drag source and drop target
  drag(drop(ref));
  
  return (
    <div 
      ref={ref} 
      className={`border rounded-md p-2 bg-gray-50 ${isDragging ? 'opacity-50' : ''} cursor-move`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
          #{index + 1}
        </span>
        <span className="text-xs text-gray-500 truncate">
          {file.name.endsWith('.png') && file.name.toLowerCase() === 'index.png' ? 'Homepage' : ''}
        </span>
      </div>
      <div className="h-32 overflow-hidden rounded-md bg-gray-200">
        {file.preview && (
          <img 
            src={file.preview} 
            alt={file.name} 
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <p className="mt-1 text-xs truncate">{file.name}</p>
    </div>
  );
};

const MultiPageScreenshotUploader = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [domainName, setDomainName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle', message: 'Ready to upload' });
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [clientUrl, setClientUrl] = useState('');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [showModifier, setShowModifier] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set API URL on component mount
  useEffect(() => {
    const envApiUrl = import.meta.env.VITE_API_URL || '';
    setApiUrl(envApiUrl.trim());
    
    const envClientUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';
    setClientUrl(envClientUrl.trim());
  }, []);

  // Clean up event source and file previews on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      
      // Clean up file previews
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [eventSource, files]);

  // Function to move a file in the array (for drag and drop reordering)
  const moveFile = (dragIndex: number, hoverIndex: number) => {
    const draggedFile = files[dragIndex];
    const newFiles = [...files];
    newFiles.splice(dragIndex, 1);
    newFiles.splice(hoverIndex, 0, draggedFile);
    setFiles(newFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as FileWithPreview[];
      
      // Validate files
      const invalidFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        setError(`Some files are not images: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      // Validate file sizes (max 10MB each)
      const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError(`Some files are too large: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      // Create image previews and add unique IDs
      const filesWithPreview = selectedFiles.map((file, index) => {
        file.preview = URL.createObjectURL(file);
        file.id = `file-${Date.now()}-${index}`;
        return file;
      });
      
      // Sort files to ensure index.png is first
      const sortedFiles = [...filesWithPreview].sort((a, b) => {
        if (a.name.toLowerCase() === 'index.png') return -1;
        if (b.name.toLowerCase() === 'index.png') return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
    } else {
      setFiles([]);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters and hyphens
    const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setDomainName(sanitizedValue);
  };

  // Function to set up SSE connection
  const setupSSEConnection = (domainName: string) => {
    try {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      const sseUrl = `${apiUrl}/api/screenshot/convert-multi/progress?domainName=${domainName}`;
      console.log(`Connecting to SSE progress endpoint: ${sseUrl}`);
      
      const newEventSource = new EventSource(sseUrl);
      setEventSource(newEventSource);
      
      // Set up event listeners
      newEventSource.onopen = () => {
        console.log('SSE connection opened');
        setSseConnected(true);
      };
      
      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE update:', data);
          setUploadStatus(data);
          
          // If finished, close the connection and show modifier
          if (data.status === 'finished') {
            newEventSource.close();
            setEventSource(null);
            setUploading(false);
            setShowModifier(true);
            setUploadComplete(true);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      newEventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        newEventSource.close();
        setEventSource(null);
        setSseConnected(false);
        
        if (!uploadComplete) {
          setUploading(false);
          setError('Connection to server lost. Please try connecting again.');
          setUploadStatus({ ...uploadStatus, status: 'error', message: 'Connection to server lost' });
        }
      };
      
      return newEventSource;
    } catch (error) {
      console.error('Error setting up SSE:', error);
      setSseConnected(false);
      setError('Failed to connect to progress updates. Please try again.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one screenshot file');
      return;
    }
    
    if (!domainName) {
      setError('Please enter a domain name');
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadStatus({ status: 'started', message: 'Starting upload...' });
    setUploadComplete(false);
    
    // Create form data
    const formData = new FormData();
    
    // Log the files we're uploading in their user-specified order
    console.log(`Uploading ${files.length} files in user-specified order:`);
    files.forEach((file, index) => {
      console.log(`File ${index + 1}: ${file.name}, size: ${file.size} bytes`);
      formData.append('screenshots', file);
      
      // Also append the index to preserve order
      formData.append('fileOrder', index.toString());
    });
    
    try {
      // Close any existing event source
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      // Use the trimmed API URL
      const baseUrl = `${apiUrl}/api/screenshot/convert-multi`;
      const uploadUrl = `${baseUrl}?domainName=${domainName}`;
      
      console.log(`Starting multi-page upload to: ${uploadUrl}`);
      
      // First, start the POST request to upload the files
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Server responded with ${uploadResponse.status}: ${errorText}`);
      }
      
      const responseData = await uploadResponse.json();
      console.log('Upload response:', responseData);
      
      // Now connect to SSE endpoint for progress updates
      setupSSEConnection(domainName);
      
    } catch (error) {
      console.error('Error uploading screenshots:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setUploadStatus({ status: 'error', message: 'Upload failed' });
      setUploading(false);
      
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  // Reconnect to SSE progress updates
  const handleReconnect = () => {
    if (!domainName) {
      setError('Domain name is required');
      return;
    }
    
    setError(null);
    setSseConnected(false);
    
    // Try to reconnect to SSE
    setupSSEConnection(domainName);
  };

  const resetForm = () => {
    setFiles([]);
    setUploadStatus({ status: 'idle', message: 'Ready to upload' });
    setError(null);
    setShowModifier(false);
    
    // Clean up file previews
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get status badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle successful modification
  const handleModificationSuccess = (modifyResult: any) => {
    // Update any relevant state
    console.log('Website modified:', modifyResult);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Multi-Page Website Generator</h2>
        
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
            <label htmlFor="screenshots" className="block text-sm font-medium text-gray-700 mb-1">
              Website Screenshots
            </label>
            <input
              type="file"
              id="screenshots"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              multiple
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Upload screenshots of the different pages you want to create (PNG or JPEG, max 10MB each)
            </p>
            <p className="mt-1 text-sm font-medium text-blue-600">
              Tip: Name your files according to the pages you want to create (e.g., index.png, about.png, contact.png)
            </p>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">Selected Files ({files.length})</h3>
                <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  Drag to reorder pages
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Files will be processed in the order shown below. The first file (index.png if present) will become your homepage.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((file, index) => (
                  <DraggableFile 
                    key={file.id || index}
                    file={file} 
                    index={index} 
                    moveFile={moveFile}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          
          {/* Always show the buttons section */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {uploading ? 'Processing...' : 'Generate Multi-Page Website'}
            </button>
            
            {/* Only show reset if there's something to reset */}
            {(files.length > 0 || uploadStatus.status !== 'idle') && (
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
        
        {/* Upload progress section */}
        {(uploading || uploadStatus.status === 'finished') && (
          <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50">
            <h3 className="font-medium text-lg mb-3">
              {uploadStatus.status === 'finished' ? 'Website Generated!' : 'Generating Website...'}
            </h3>
            
            {/* File details section */}
            <div className="mb-3 text-sm text-gray-500">
              <p>Processing domain: <span className="font-medium">{domainName}</span></p>
              <p>Total files to process: <span className="font-medium">{files.length}</span></p>
            </div>
            
            {/* Connection status */}
            {!sseConnected && uploadStatus.status !== 'finished' && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-700">Lost connection to progress updates.</p>
                <button
                  onClick={handleReconnect}
                  className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                >
                  Reconnect
                </button>
              </div>
            )}
            
            {/* Current file status */}
            {uploadStatus.currentFile && uploadStatus.status !== 'finished' && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Currently processing: <span className="font-medium">{uploadStatus.currentFile}</span>
                </p>
                <p className="mt-1">{uploadStatus.message}</p>
              </div>
            )}
            
            {/* Progress indicator */}
            {uploadStatus.completedFiles && uploadStatus.totalFiles && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress:</span>
                  <span>{uploadStatus.completedFiles.length} of {uploadStatus.totalFiles}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(uploadStatus.completedFiles.length / uploadStatus.totalFiles) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Completed files list */}
            {uploadStatus.completedFiles && uploadStatus.completedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Files Processed:</h4>
                <div className="divide-y divide-gray-200 border rounded-md">
                  {uploadStatus.completedFiles.map((file, index) => (
                    <div key={index} className="p-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm">{file.name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getStatusColor(file.success ? 'completed' : 'error')}`}>
                          {file.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      {file.success && file.url && (
                        <a 
                          href={`${clientUrl}${file.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Final website link */}
            {uploadStatus.status === 'finished' && uploadStatus.websiteUrl && (
              <div className="mt-4 flex justify-center">
                <a 
                  href={`${clientUrl}${uploadStatus.websiteUrl}`}
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
        
        {/* Show WebsiteModifier component if we have completed the generation */}
        {showModifier && uploadStatus.status === 'finished' && (
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
          <h3 className="text-lg font-semibold mb-2">How Multi-Page Website Generation Works</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Upload screenshots of different pages you want to create (index.png, about.png, etc.)</li>
            <li><strong>Arrange the files in your desired processing order</strong> using drag and drop</li>
            <li>Our AI analyzes each image and generates HTML/CSS code for each page</li>
            <li>Pages are saved with the appropriate filenames in your project folder</li>
            <li>You can view and navigate through the complete multi-page website</li>
            <li>Use natural language to request modifications to any page of your website</li>
          </ol>
        </div>
      </div>
    </DndProvider>
  );
};

export default MultiPageScreenshotUploader; 