import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  
  // Function to determine if a link is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="bg-white shadow-md w-full p-4 h-[64px]">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-700 hover:text-blue-800 transition-colors">
          Domorph
        </Link>
        <ul className="flex items-center gap-x-6 max-[420px]:hidden">
          <li>
            <Link 
              to="/" 
              className={`font-medium hover:text-blue-600 transition-colors ${isActive('/') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700'}`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link 
              to="/screenshot" 
              className={`font-medium hover:text-blue-600 transition-colors ${isActive('/screenshot') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-700'}`}
            >
              Screenshot to Code
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
