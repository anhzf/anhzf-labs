import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ message: 'ok!'})
      }
    }
  }
})