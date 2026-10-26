import { serverSupabase } from './supabase';
export async function requireRole(roles: string[] = ['admin','editor']) {
 const supabase = await serverSupabase();
 const {data:{user},error} = await supabase.auth.getUser();
 if(error || !user) return {supabase, user:null, role:null};
 const {data} = await supabase.from('profiles').select('role').eq('id',user.id).single();
 const role = data?.role as string | undefined;
 return {supabase,user:roles.includes(role || '')?user:null,role:role || null};
}
