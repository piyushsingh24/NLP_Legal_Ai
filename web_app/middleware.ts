// Middleware is intentionally empty — no authentication required
// Edge Runtime compatible

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

// Only run middleware on specific paths (none currently needed)
export const config = { matcher: [] }
