import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { asegurarEmpresa } from '@/lib/empresa';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/panel';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && dest === '/panel') await asegurarEmpresa(supabase, user);
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
