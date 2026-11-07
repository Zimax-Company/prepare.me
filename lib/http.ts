import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type z } from 'zod'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, details)
export const unauthorized = (msg = 'Unauthenticated') => new ApiError(401, msg)
export const forbidden = (msg = 'You do not have permission to perform this action') => new ApiError(403, msg)
export const notFound = (what = 'Resource') => new ApiError(404, `${what} not found`)
export const conflict = (msg: string) => new ApiError(409, msg)

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export const created = <T>(data: T) => ok(data, 201)
export const noContent = () => new NextResponse(null, { status: 204 })

type Params = Record<string, string>
type RouteContext<P extends Params> = { params: Promise<P> }

/** Wraps a route handler with uniform error handling and resolved params. */
export function handle<P extends Params = Params>(
  fn: (req: NextRequest, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    try {
      return await fn(req, (await ctx.params) ?? ({} as P))
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}

function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { message: err.message, details: err.details } }, { status: err.status })
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { message: 'Validation failed', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } },
      { status: 422 },
    )
  }
  const code = (err as { code?: string })?.code
  if (code === 'ER_DUP_ENTRY') {
    return NextResponse.json({ error: { message: 'A record with these details already exists' } }, { status: 409 })
  }
  if (code === 'ER_ROW_IS_REFERENCED_2') {
    return NextResponse.json({ error: { message: 'This record is in use and cannot be deleted' } }, { status: 409 })
  }
  console.error(err)
  return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
}

export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw badRequest('Request body must be valid JSON')
  }
  return schema.parse(json)
}

export function parseQuery<S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams))
}

export function id(value: string | undefined, what = 'Resource'): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n <= 0) throw notFound(what)
  return n
}
