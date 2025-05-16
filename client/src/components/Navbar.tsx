

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center w-full p-4">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold">Domorph</h1>
        <ul className="flex justify-between items-center gap-x-3 *:cursor-pointer">
            <li>Home</li>
            <li>About</li>
            <li>Contact</li>
        </ul>
      </div>
    </nav>
  )
}
