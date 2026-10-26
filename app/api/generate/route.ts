import { NextRequest,NextResponse } from 'next/server';
import OpenAI from 'openai';
import {requireRole} from '@/lib/auth';
import {PROMPT} from '@/lib/prompt';
import {z} from 'zod';
export const runtime='nodejs';
const schema=z.object({day:z.enum(['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']),states:z.array(z.enum(['Coahuila','Tamaulipas'])).min(1).max(2),images:z.array(z.object({mime:z.enum(['image/jpeg','image/png','image/webp']),data:z.string().max(8_000_000)})).min(1).max(2)});
export async function POST(req:NextRequest){
 const {supabase,user}=await requireRole();
 if(!user) return NextResponse.json({error:'Acceso no autorizado o rol insuficiente'},{status:403});
 if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:'OPENAI_API_KEY no configurada'},{status:503});
 const body=await req.json().catch(()=>null); const parsed=schema.safeParse(body);
 if(!parsed.success) return NextResponse.json({error:'Solicitud inválida',details:parsed.error.flatten()},{status:400});
 const {day,states,images}=parsed.data;
 if(images.some(i=>!/^[-A-Za-z0-9+/=]+$/.test(i.data) || Buffer.from(i.data,'base64').length>5_000_000)) return NextResponse.json({error:'Imagen inválida o mayor a 5 MB'},{status:400});
 // Atomic quota claim via SQL RPC; avoids concurrent requests bypassing the daily limit.
 const {data:allowed,error:quotaError}=await supabase.rpc('claim_generation_slot',{p_user_id:user.id,p_daily_limit:25});
 if(quotaError || !allowed) return NextResponse.json({error:'Límite diario de 25 generaciones alcanzado o servicio de cuotas no disponible'},{status:429});
 try {
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[]=[{type:'text',text:`Día: ${day}. Estados a producir: ${states.join(' y ')}. Si se adjuntan dos capturas, identifica a qué estado pertenece cada una por sus municipios.`},...images.map(i=>({type:'image_url' as const,image_url:{url:`data:${i.mime};base64,${i.data}`,detail:'high' as const}}))];
  const result=await openai.chat.completions.create({model:process.env.OPENAI_MODEL || 'gpt-4.1-mini',temperature:0.45,response_format:{type:'json_object'},messages:[{role:'system',content:PROMPT},{role:'user',content}]});
  const raw=result.choices[0]?.message?.content;
  if(!raw) throw new Error('Respuesta vacía');
  const output=JSON.parse(raw);
  if(!Array.isArray(output.scripts)) throw new Error('Formato de respuesta inesperado');
  const filtered=output.scripts.filter((s:{state?:string})=>states.includes(s.state as 'Coahuila'|'Tamaulipas'));
  if(!filtered.length) throw new Error('No se identificaron los estados solicitados');
  const {error:saveError}=await supabase.from('generations').insert({user_id:user.id,day,states,output:{scripts:filtered}});
  return NextResponse.json({scripts:filtered,warning:saveError?'Guion generado; no se pudo guardar el historial.':undefined});
 } catch(e) {console.error('Generation failed',e);return NextResponse.json({error:'No fue posible generar el guion. Verifica las imágenes e inténtalo nuevamente.'},{status:502});}
}
