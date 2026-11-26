// Capa de componentes: «Compartir en Instagram» — arma una imagen tipo story del entrenamiento registrado

import { useEffect, useMemo, useState } from 'react';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { hayQueCompartir, resumenHistoria } from '../domain/historia';
import { crearImagenHistoria } from '../services/historiaImagen';

interface Props {
  dia?: Dia;
  registro: RegistroDia;
  apodo: string;
}

// Se prepara la imagen primero y se comparte con un segundo toque: el iPhone solo abre
// el menú de compartir si el toque y el envío van juntos (sin esperar a dibujar la imagen).
function CompartirHistoria({ dia, registro, apodo }: Props): React.JSX.Element | null {
  const resumen = useMemo(() => resumenHistoria(dia, registro, apodo), [dia, registro, apodo]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState('');
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      if (vista) URL.revokeObjectURL(vista);
    },
    [vista],
  );

  if (!hayQueCompartir(resumen)) return null;

  const puedeCompartir = Boolean(archivo && navigator.canShare?.({ files: [archivo] }));

  async function preparar() {
    setError('');
    setPreparando(true);
    try {
      const f = await crearImagenHistoria(resumen);
      setArchivo(f);
      setVista(URL.createObjectURL(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la imagen.');
    } finally {
      setPreparando(false);
    }
  }

  async function compartir() {
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo] });
    } catch (e) {
      // Cerrar el menú sin elegir nada no es un error
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError('No se pudo abrir el menú de compartir.');
    }
  }

  function cerrar() {
    setArchivo(null);
    setVista('');
  }

  return (
    <>
      <button type="button" className="boton ancho compartir-historia" onClick={preparar} disabled={preparando}>
        {preparando ? 'Preparando imagen…' : '📸 Compartir en Instagram'}
      </button>
      {error && <p className="aviso-error">{error}</p>}

      {archivo && vista && (
        <div className="historia-fondo" role="dialog" aria-label="Imagen para compartir">
          <div className="historia-ventana">
            <img src={vista} alt={`Resumen del entrenamiento: ${resumen.titulo}`} />
            {puedeCompartir ? (
              <>
                <button type="button" className="boton ancho compartir-historia" onClick={compartir}>
                  Compartir
                </button>
                <small>Elige Instagram → Historia y etiqueta a tu coach.</small>
              </>
            ) : (
              <>
                <a className="boton ancho compartir-historia" href={vista} download={archivo.name}>
                  Descargar imagen
                </a>
                <small>Guárdala (o mantén presionada la imagen) y súbela a tu historia de Instagram.</small>
              </>
            )}
            <button type="button" className="boton ancho secundario" onClick={cerrar}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default CompartirHistoria;
