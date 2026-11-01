// Capa de servicios: carga el plan del atleta desde public/planes/<codigo>.json

import type { Plan } from '../data/plan';

// Código por defecto mientras no hay login. Se puede cambiar con ?a=<codigo> en la URL.
const CODIGO_POR_DEFECTO = 'marcelo-x7k3';

export function codigoAtleta(): string {
  const desdeUrl = new URLSearchParams(window.location.search).get('a');
  if (desdeUrl) {
    try {
      localStorage.setItem('amp.atleta', desdeUrl);
    } catch {
      /* sin almacenamiento */
    }
    return desdeUrl;
  }
  try {
    return localStorage.getItem('amp.atleta') || CODIGO_POR_DEFECTO;
  } catch {
    return CODIGO_POR_DEFECTO;
  }
}

export async function cargarPlan(codigo: string): Promise<Plan> {
  const url = `${import.meta.env.BASE_URL}planes/${codigo}.json`;
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`No encontramos el plan «${codigo}»`);
  const plan = (await resp.json()) as Plan;
  plan.dias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return plan;
}
