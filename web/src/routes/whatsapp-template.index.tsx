import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/whatsapp-template/')({
  component: WhatsappTemplateIndex,
})

function WhatsappTemplateIndex() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
      <p className="mt-4 text-gray-600">Template list coming soon...</p>
    </div>
  )
}
