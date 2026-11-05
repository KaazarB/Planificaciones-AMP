// Capa de estado: cuántos atletas necesitan algo del coach (bloque por renovar o ficha pendiente)

import { useEffect, useState } from 'react';

import { hoyISO } from '../domain/fechas';
import { alertasRenovacion } from '../domain/renovacion';
import { ultimosBloques } from '../services/plan';
import { supabase } from '../services/supabase';

export function useRenovaciones(activo: boolean): number {
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    const contar = async () => {
      try {
        const [{ data }, ultimos] = await Promise.all([
          supabase.from('perfiles').select('id, estado, rol'),
          ultimosBloques(),
        ]);
        const perfiles = (data ?? []) as { id: string; estado: string; rol: string }[];
        const fichas = perfiles.filter((p) => p.estado === 'ficha' && p.rol !== 'coach').length;
        if (vigente) setCantidad(alertasRenovacion(perfiles, ultimos, hoyISO()).length + fichas);
      } catch {
        /* sin conexión: se mantiene el último valor */
      }
    };
    contar();
    // Se vuelve a contar al volver a la app y cada 10 minutos
    const alVolver = () => document.visibilityState === 'visible' && contar();
    document.addEventListener('visibilitychange', alVolver);
    const intervalo = window.setInterval(contar, 10 * 60 * 1000);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alVolver);
      window.clearInterval(intervalo);
    };
  }, [activo]);

  return cantidad;
}
