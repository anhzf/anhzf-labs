import { createFileRoute } from '@tanstack/react-router'
import * as math from 'mathjs/number'

export const Route = createFileRoute('/api/math')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const result = math.parse(url.searchParams.get('expr') as string)

          return Response.json({
            result,
            expr: result.toString(),
            params: [...url.searchParams.entries()],
          })
        } catch (error: any) {
          return Response.json(
            {
              error,
              params: [...new URL(request.url).searchParams.entries()],
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
