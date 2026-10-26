import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/auth';
export async function GET(){const {supabase,user}=await requireRole(['admin','editor','viewer']);if(!user)return NextResponse.json({error:'No autorizado'},{status:401});const {data,error}=await supabase.from('generations').select('id,created_at,day,states,output').order('created_at',{ascending:false}).limit(30);return error?NextResponse.json({error:'No se pudo consultar el historial'},{status:500}):NextResponse.json({items:data});}
