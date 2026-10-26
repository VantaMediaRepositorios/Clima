# INFO 7 · Weather Studio

Plataforma privada de guiones meteorológicos con Next.js, Supabase Auth/RLS y OpenAI Vision. Diseñada para Camila Cavazos (Tamaulipas) y Roberta Cantú (Coahuila).

## Funciones
- Login con correo y contraseña (usuarios invitados desde Supabase; sin registro público).
- Roles: `admin`, `editor` generan y consultan; `viewer` solo consulta.
- Carga de 1–2 capturas PNG/JPG/WEBP de hasta 5 MB cada una.
- Generación de guiones con secciones y lectura de datos; advertencias si hay información ilegible.
- Edición en navegador, copia de guiones y exportación TXT.
- Historial por usuario, visible globalmente para administradores.
- Límite atómico de 25 solicitudes por usuario/día (zona horaria Monterrey).
- La API key de OpenAI permanece en servidor. No se suben imágenes a Supabase; se envían a OpenAI para procesarlas.

## Instalación local

1. Requiere Node.js 20.9+.
2. Crea un proyecto en https://supabase.com y ejecuta `supabase/schema.sql` en SQL Editor.
3. En Supabase > Authentication > Providers, habilita Email. Desactiva **Allow new users to sign up** para evitar registros públicos.
4. En Authentication > Users invita a los integrantes. Para usar invitaciones, configura el proveedor de correo SMTP de Supabase en producción.
5. Promueve a tu usuario a `admin` y a los productores a `editor` desde SQL Editor (ejemplos al final de `schema.sql`). Usuarios nuevos son `viewer` por defecto.
6. Copia `.env.example` a `.env.local` y completa las cuatro variables. **No compartas `.env.local` ni claves secretas**.
7. Ejecuta:

```bash
npm install
npm run dev
```

8. Visita http://localhost:3000 e inicia sesión con tu usuario.

## Despliegue GitHub + Vercel

1. Crea un repositorio privado de GitHub y sube el contenido de esta carpeta, **no** el ZIP ni los archivos `.env.local`.
2. En https://vercel.com selecciona **Add New Project**, importa el repositorio y usa el framework Next.js.
3. En Project Settings > Environment Variables agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` y `OPENAI_MODEL` (opcional).
4. Despliega. Agrega la URL `https://TU-PROYECTO.vercel.app/auth/callback` en Supabase > Authentication > URL Configuration > Redirect URLs, y configura Site URL a tu dominio.
5. Usa un dominio propio y HTTPS. Revisa los límites de gasto en OpenAI y el uso de funciones de Vercel.

## Seguridad y límites

- El navegador jamás recibe `OPENAI_API_KEY`; solo la función `/api/generate` llama a OpenAI.
- Autorización verificada en el servidor con `auth.getUser()` y rol almacenado en la base de datos; no se confía en el rol del cliente.
- RLS de Supabase protege perfiles e historial. La cuota diaria se reclama atómicamente mediante función SQL con permisos mínimos.
- El control de cuotas cuenta intentos, incluso cuando falla OpenAI, para reducir abuso. El límite no sustituye controles de presupuesto de OpenAI/Vercel.
- La lectura de capturas por IA puede cometer errores: **revisar siempre los datos extraídos antes de emitir**. Esta versión presenta la tabla extraída junto con el guion, pero no incluye un paso de aprobación previo a la generación.
- Los guiones generados se almacenan en Supabase; las capturas no se almacenan permanentemente por la aplicación.
- El proyecto no incluye panel visual para invitar usuarios ni gestión de roles: esas tareas se hacen en el panel de Supabase.
- Si tu organización requiere SSO, auditoría formal, retención específica o políticas adicionales, deben añadirse antes de uso empresarial sensible.

## Ajustar el estilo editorial

Edita `lib/prompt.ts`. Incluye orden de municipios, presentadoras, estructura de guion y reglas para días hábiles y fines de semana. Puedes afinarlo con el prompt maestro completo.

## Estructura

```
app/                  Páginas, login, API y estilos
components/studio.tsx Interfaz principal
lib/prompt.ts         Instrucciones editoriales
lib/auth.ts           Verificación de permisos
lib/supabase.ts       Cliente Supabase del servidor
supabase/schema.sql   Tablas, roles, RLS y cuota diaria
middleware.ts         Protección de páginas
```
