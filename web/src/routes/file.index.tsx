import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/file/')({
  component: FileIndex,
})

function FileIndex() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">File Tools</h1>
      <p className="mt-4 text-gray-600">
        File manipulation utilities coming soon...
      </p>
    </div>
  )
}
