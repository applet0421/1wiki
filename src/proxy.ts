import { NextResponse, type NextRequest } from "next/server";

import { canonicalHostRedirect } from "@/lib/http/canonical-host";

export function proxy(request: NextRequest) {
  const location = canonicalHostRedirect(request);
  if (!location) return NextResponse.next();

  return new NextResponse(null, {
    status: 301,
    headers: { Location: location },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
