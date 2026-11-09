// Aviso al coach por correo (Resend) cuando un atleta envía su ficha por primera vez o la cambia.
// Lo llama la base de datos (pg_net, ver supabase/aviso_ficha.sql) con { cambio_id } al guardarse un cambio.
// No necesita sesión: solo avisa de cambios reales, de los últimos 15 minutos y que todavía no se avisaron,
// así que llamarla de nuevo nunca repite un correo.
// Secretos: RESEND_API_KEY (en Supabase → Edge Functions → Secrets). SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY los pone Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

import ETIQUETAS from './etiquetas.json' with { type: 'json' };

const PANEL = 'https://kaazarb.github.io/Planificaciones-AMP/movil/#/coach';
const VENTANA_MS = 15 * 60 * 1000;
// Datos de salud: el correo solo dice que cambiaron; el detalle se ve en el panel
const SENSIBLES = new Set(['lesiones', 'condiciones', 'comentarios', 'autorizacion', 'consentimiento']);

type Ficha = Record<string, unknown>;

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function texto(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}

function cambios(antes: Ficha, despues: Ficha) {
  const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
  return claves
    .filter((k) => JSON.stringify(antes[k] ?? null) !== JSON.stringify(despues[k] ?? null))
    .map((k) => ({
      etiqueta: (ETIQUETAS as Record<string, string>)[k] ?? k,
      antes: SENSIBLES.has(k) ? 'cambió (revísalo en el panel)' : texto(antes[k]),
      despues: SENSIBLES.has(k) ? '' : texto(despues[k]),
    }));
}

const hora = (marca: string) =>
  new Date(marca).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405);
  let cambioId = 0;
  try {
    cambioId = Number((await req.json()).cambio_id);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  if (!Number.isInteger(cambioId) || cambioId <= 0) return json({ error: 'cambio_id inválido' }, 400);

  const clave = Deno.env.get('RESEND_API_KEY');
  if (!clave) return json({ estado: 'falta RESEND_API_KEY' }, 500);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cambio } = await db.from('fichas_cambios').select('*').eq('id', cambioId).maybeSingle();
  if (!cambio) return json({ estado: 'no existe' }, 404);
  if (cambio.avisado) return json({ estado: 'ya avisado' });
  if (Date.now() - new Date(cambio.creado).getTime() > VENTANA_MS) return json({ estado: 'antiguo' });

  // Se reserva el aviso antes de enviar: si llaman dos veces a la vez, solo una envía
  const { data: reservado } = await db
    .from('fichas_cambios')
    .update({ avisado: new Date().toISOString() })
    .eq('id', cambioId)
    .is('avisado', null)
    .select('id');
  if (!reservado?.length) return json({ estado: 'ya avisado' });
  const liberar = () => db.from('fichas_cambios').update({ avisado: null }).eq('id', cambioId);

  const [{ data: atleta }, { data: coaches }, { data: ficha }] = await Promise.all([
    db.from('perfiles').select('nombre, apodo, estado').eq('id', cambio.atleta_id).maybeSingle(),
    db.from('perfiles').select('correo').eq('rol', 'coach'),
    db.from('fichas').select('actualizado').eq('atleta_id', cambio.atleta_id).maybeSingle(),
  ]);
  const para = (coaches ?? []).map((c) => c.correo as string).filter(Boolean);
  if (!atleta || !para.length) {
    await liberar();
    return json({ estado: 'sin atleta o sin correo de coach' }, 500);
  }

  const nombre = atleta.nombre || atleta.apodo || 'Un atleta';
  const corto = atleta.apodo || nombre.split(' ')[0];
  const cuando = ficha?.actualizado ? hora(ficha.actualizado) : hora(cambio.creado);
  const nueva = !cambio.antes;
  const lista = nueva ? [] : cambios(cambio.antes as Ficha, cambio.despues as Ficha);

  const asunto = nueva ? `Nueva ficha: ${nombre} espera su planificación` : `${corto} cambió su ficha`;
  const intro = nueva
    ? `${nombre} envió su ficha (${cuando}). Ya aparece en «Esperando su plan» en tu panel.`
    : `${nombre} cambió su ficha (${cuando}). Revisa los cambios y ajusta su planificación.`;
  const filasHtml = lista
    .map(
      (c) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e5e2;color:#555">${esc(c.etiqueta)}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e5e5e2"><b>${esc(c.antes)}</b>` +
        (c.despues ? ` → <b style="color:#1f8a4c">${esc(c.despues)}</b>` : '') +
        '</td></tr>',
    )
    .join('');
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:560px">' +
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#6b6b6b">AMP · PLANIFICACIÓN KAAZAR</p>' +
    `<h2 style="margin:0 0 12px">${esc(asunto)}</h2><p>${esc(intro)}</p>` +
    (filasHtml
      ? `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 16px">${filasHtml}</table>`
      : lista.length === 0 && !nueva
        ? '<p>No cambió ningún dato visible: solo volvió a guardar la ficha.</p>'
        : '') +
    `<p><a href="${PANEL}" style="display:inline-block;background:#17191c;color:#fff;padding:10px 16px;` +
    'border-radius:10px;text-decoration:none">Abrir el panel del coach</a></p></div>';
  const textoPlano =
    `${intro}\n\n` +
    lista.map((c) => `• ${c.etiqueta}: ${c.antes}${c.despues ? ` → ${c.despues}` : ''}`).join('\n') +
    `\n\nPanel del coach: ${PANEL}`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AMP Planificación <onboarding@resend.dev>',
      to: para,
      subject: asunto,
      html,
      text: textoPlano,
    }),
  });
  if (!r.ok) {
    await liberar(); // se puede reintentar dentro de los 15 minutos
    return json({ estado: 'Resend rechazó el envío', status: r.status, detalle: await r.text() }, 502);
  }
  return json({ estado: 'enviado', cambios: lista.length });
});
