import {NextRequest,NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase';
export async function GET(request:NextRequest){const {searchParams,origin}=new URL(request.url);const code=searchParams.get('code');if(code){const supabase=await serverSupabase();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(`${origin}/`);}return NextResponse.redirect(`${origin}/login?error=callback`);}
