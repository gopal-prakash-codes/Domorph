

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center w-full p-4 h-[64px]">
      <div className="flex justify-between max-[420px]:justify-center items-center w-full">
        <h1 className="text-2xl max-[420px]:text-3xl font-bold">Domorph</h1>
        <ul className="flex justify-between items-center gap-x-3 *:cursor-pointer max-[420px]:hidden">
            <li>Home</li>
            <li>About</li>
            <li>Contact</li>
        </ul>
      </div>
    </nav>
  )
}
