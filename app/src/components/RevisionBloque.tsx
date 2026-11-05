// Capa de componentes: el atleta cuenta cómo le fue antes de que el coach arme su próximo bloque

import { useEffect, useState } from 'react';

import type { DatosFicha } from '../data/ficha';
import { camposVisibles } from '../data/revision';
import { fechaLarga } from '../domain/fechas';
import { mensajeError } from '../services/cuenta';
import { enviarRevision, leerRevision } from '../services/revisiones';

import CampoFichaInput from './CampoFichaInput';

interface Props {
  atleta: string;
  bloque: number;
  fin: string; // último día del bloque
}

function RevisionBloque({ atleta, bloque, fin }: Props): React.JSX.Element | null {
  const [estado, setEstado] = useState<'cargando' | 'pendiente' | 'respondida'>('cargando');
  const [abierta, setAbierta] = useState(false);
  const [datos, setDatos] = useState<DatosFicha>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerRevision(atleta, bloque)
      .then((r) => vigente && setEstado(r ? 'respondida' : 'pendiente'))
      .catch(() => vigente && setEstado('pendiente'));
    return () => {
      vigente = false;
    };
  }, [atleta, bloque]);

  if (estado === 'cargando') return null;

  if (estado === 'respondida') {
    return (
      <p className="aviso revision-lista">
        ✓ Respondiste la revisión del Bloque {bloque}. Tu coach la usará para armar el siguiente.
      </p>
    );
  }

  const campos = camposVisibles(datos);

  async function enviar() {
    const falta = campos
      .filter((c) => c.requerido)
      .filter((c) => {
        const v = datos[c.clave];
        return v === undefined || v === '' || (Array.isArray(v) && !v.length);
      });
    if (falta.length) return setError(`Completa: ${falta.map((c) => c.etiqueta).join(', ')}`);
    setEnviando(true);
    setError('');
    try {
      const limpio = Object.fromEntries(Object.entries(datos).filter(([k]) => campos.some((c) => c.clave === k)));
      await enviarRevision(atleta, bloque, limpio);
      setEstado('respondida');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="revision">
      <p className="revision-titulo">
        Tu Bloque {bloque} termina el {fechaLarga(fin)}
      </p>
      <p className="revision-texto">Antes de armar el siguiente, cuéntale a tu coach cómo te fue. Es solo 1 minuto.</p>
      {!abierta ? (
        <button className="boton ancho" onClick={() => setAbierta(true)}>
          Responder revisión
        </button>
      ) : (
        <div className="revision-form">
          {campos.map((c) => (
            <CampoFichaInput
              key={c.clave}
              campo={c}
              datos={datos}
              onCambiar={(clave, valor) => {
                setDatos({ ...datos, [clave]: valor });
                setError('');
              }}
            />
          ))}
          {error && <p className="aviso-error">{error}</p>}
          <button className="boton ancho" onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar a mi coach'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RevisionBloque;
