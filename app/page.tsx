import {serverSupabase} from '@/lib/supabase';
import {redirect} from 'next/navigation';
import Studio from '@/components/studio';
export default async function Home(){const db=await serverSupabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();return <Studio email={user.email||''} role={profile?.role||'viewer'}/>}
