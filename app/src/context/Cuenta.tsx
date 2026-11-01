// Capa de estado: quién está conectado y cuál es su perfil (disponible en toda la app)

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { Perfil } from '../services/cuenta';
import { leerPerfil } from '../services/cuenta';
import { supabase } from '../services/supabase';

interface ValorCuenta {
  cargando: boolean;
  sesion: Session | null;
  perfil: Perfil | null;
  error: string;
  recargar: () => Promise<void>;
  cambiarPerfil: (cambio: Partial<Perfil>) => void;
}

const CuentaContext = createContext<ValorCuenta | null>(null);

export function CuentaProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState('');

  const cargarPerfil = useCallback(async (s: Session | null) => {
    setError('');
    if (!s) {
      setPerfil(null);
      setCargando(false);
      return;
    }
    try {
      setPerfil(await leerPerfil(s.user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      cargarPerfil(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'TOKEN_REFRESHED') return;
      setSesion(s);
      cargarPerfil(s);
    });
    return () => data.subscription.unsubscribe();
  }, [cargarPerfil]);

  const valor: ValorCuenta = {
    cargando,
    sesion,
    perfil,
    error,
    recargar: () => cargarPerfil(sesion),
    cambiarPerfil: (cambio) => setPerfil((p) => (p ? { ...p, ...cambio } : p)),
  };
  return <CuentaContext.Provider value={valor}>{children}</CuentaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCuenta(): ValorCuenta {
  const v = useContext(CuentaContext);
  if (!v) throw new Error('useCuenta fuera de CuentaProvider');
  return v;
}
