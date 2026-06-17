import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <h1 className="text-4xl font-bold">Anhzf Labs</h1>
      <div className="flex flex-col gap-4">
        <Link to="/whatsapp-template" className="text-blue-600 hover:underline">
          WhatsApp Template
        </Link>
        <Link to="/file" className="text-blue-600 hover:underline">
          File Tools
        </Link>
      </div>
    </div>
  )
}
