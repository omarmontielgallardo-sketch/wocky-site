import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next(); // sin Supabase configurado, solo funciona la página pública

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && path.startsWith('/panel')) {
    const to = request.nextUrl.clone(); to.pathname = '/login'; to.search = '';
    return NextResponse.redirect(to);
  }
  if (user && (path === '/login' || path === '/registro')) {
    const to = request.nextUrl.clone(); to.pathname = '/panel'; to.search = '';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.svg|logo.png|logo.svg).*)'] };
