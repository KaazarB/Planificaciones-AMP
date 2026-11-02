// Capa de componentes: ficha de inscripción por pasos (guarda un borrador en el teléfono)

import { useState } from 'react';

import type { DatosFicha } from '../data/ficha';
import { faltantes, limpiarFicha, pasosVisibles } from '../data/ficha';

import CampoFichaInput from './CampoFichaInput';

interface Props {
  usuarioId: string;
  inicial?: DatosFicha | null;
  textoEnviar: string;
  onEnviar: (datos: DatosFicha) => Promise<void>;
}

const claveBorrador = (id: string) => `amp.ficha.borrador.${id}`;

function leerBorrador(id: string): DatosFicha | null {
  try {
    return JSON.parse(localStorage.getItem(claveBorrador(id)) || 'null') as DatosFicha | null;
  } catch {
    return null;
  }
}

function FichaFormulario({ usuarioId, inicial, textoEnviar, onEnviar }: Props): React.JSX.Element {
  const [datos, setDatos] = useState<DatosFicha>(() => inicial ?? leerBorrador(usuarioId) ?? {});
  const [paso, setPaso] = useState(0);
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pasos = pasosVisibles(datos);
  const indice = Math.min(paso, pasos.length - 1);
  const actual = pasos[indice];
  const esUltimo = indice === pasos.length - 1;

  function cambiar(clave: string, valor: string | string[] | boolean) {
    const nuevos = { ...datos, [clave]: valor };
    setDatos(nuevos);
    setAviso('');
    try {
      localStorage.setItem(claveBorrador(usuarioId), JSON.stringify(nuevos));
    } catch {
      /* sin almacenamiento */
    }
  }

  async function siguiente() {
    const falta = faltantes(actual, datos);
    if (falta.length) {
      setAviso(`Completa: ${falta.join(', ')}`);
      return;
    }
    if (!esUltimo) {
      setPaso(indice + 1);
      document.querySelector('.plan')?.scrollTo?.(0, 0);
      return;
    }
    setEnviando(true);
    try {
      await onEnviar(limpiarFicha(datos));
      try {
        localStorage.removeItem(claveBorrador(usuarioId));
      } catch {
        /* nada */
      }
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ficha">
      <div className="ficha-progreso" aria-label={`Paso ${indice + 1} de ${pasos.length}`}>
        {pasos.map((p, i) => (
          <span key={p.titulo} className={i <= indice ? 'hecho' : ''} />
        ))}
      </div>
      <p className="ficha-paso">
        Paso {indice + 1} de {pasos.length}
      </p>
      <h2 className="ficha-titulo">{actual.titulo}</h2>
      {actual.descripcion && <p className="ficha-descripcion">{actual.descripcion}</p>}

      {actual.campos.map((c) => (
        <CampoFichaInput key={c.clave} campo={c} datos={datos} onCambiar={cambiar} />
      ))}

      {aviso && <p className="aviso-error">{aviso}</p>}

      <div className="ficha-botones">
        {indice > 0 && (
          <button type="button" className="boton secundario" onClick={() => setPaso(indice - 1)}>
            Atrás
          </button>
        )}
        <button type="button" className="boton" onClick={siguiente} disabled={enviando}>
          {enviando ? 'Enviando…' : esUltimo ? textoEnviar : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

export default FichaFormulario;
