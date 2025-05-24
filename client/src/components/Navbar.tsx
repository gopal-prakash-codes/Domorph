import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center w-full p-4 h-[64px]">
      <div className="flex justify-between max-[420px]:justify-center items-center w-full">
        <Link to="/" className="text-2xl max-[420px]:text-3xl font-bold">Domorph</Link>
        <ul className="flex justify-between items-center gap-x-3 *:cursor-pointer max-[420px]:hidden">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/screenshot">Screenshot to Code</Link></li>
          <li>About</li>
          <li>Contact</li>
        </ul>
      </div>
    </nav>
  )
}
