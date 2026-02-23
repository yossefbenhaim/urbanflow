import { Routes, Route } from 'react-router-dom'

// Portals — to be built by Frontend Agent
const Placeholder = ({ name }: { name: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800">UrbanFlow</h1>
      <p className="text-gray-500 mt-2">{name} — בבנייה 🚧</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="Tenant Portal" />} />
      <Route path="/committee/*" element={<Placeholder name="Committee Portal" />} />
      <Route path="/manager/*" element={<Placeholder name="Manager Portal" />} />
      <Route path="/provider/*" element={<Placeholder name="Provider Portal" />} />
    </Routes>
  )
}
