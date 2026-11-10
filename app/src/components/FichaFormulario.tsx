// Capa de componentes: ficha de inscripción (guarda un borrador en el teléfono)
// modo «pregunta»: una pregunta por pantalla, con transición y avance automático al elegir una opción
// modo «paso»: cada sección completa en una pantalla (para editar una ficha ya enviada)

import { useEffect, useRef, useState } from 'react';

import type { CampoFicha, DatosFicha } from '../data/ficha';
import { faltantes, limpiarFicha, pantallasFicha, pasosVisibles } from '../data/ficha';

import CampoFichaInput from './CampoFichaInput';

interface Props {
  usuarioId: string;
  inicial?: DatosFicha | null;
  textoEnviar: string;
  onEnviar: (datos: DatosFicha) => Promise<void>;
  modo?: 'pregunta' | 'paso';
}

const claveBorrador = (id: string) => `amp.ficha.borrador.${id}`;
const PAUSA_AVANCE = 380; // ms: alcanza a verse la opción marcada antes de pasar a la siguiente

function leerBorrador(id: string): DatosFicha | null {
  try {
    return JSON.parse(localStorage.getItem(claveBorrador(id)) || 'null') as DatosFicha | null;
  } catch {
    return null;
  }
}

const vacio = (v: DatosFicha[string] | undefined) =>
  v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);

// Preguntas de una sola opción: al elegir, se pasa sola a la siguiente
const avanzaSola = (campos: CampoFicha[]) =>
  campos.length === 1 && (campos[0].tipo === 'opciones' || campos[0].tipo === 'tarjetas');

function FichaFormulario({ usuarioId, inicial, textoEnviar, onEnviar, modo = 'pregunta' }: Props): React.JSX.Element {
  const [datos, setDatos] = useState<DatosFicha>(() => inicial ?? leerBorrador(usuarioId) ?? {});
  const [posicion, setPosicion] = useState(0);
  const [direccion, setDireccion] = useState<'adelante' | 'atras'>('adelante');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const porPregunta = modo === 'pregunta';
  const pantallas = porPregunta
    ? pantallasFicha(datos)
    : pasosVisibles(datos).map((paso, i, todos) => ({
        clave: paso.titulo,
        paso,
        campos: paso.campos,
        numeroPaso: i + 1,
        totalPasos: todos.length,
        primeraDelPaso: true,
      }));
  const indice = Math.min(posicion, pantallas.length - 1);
  const actual = pantallas[indice];
  const esUltimo = indice === pantallas.length - 1;

  function irA(nuevo: number, dir: 'adelante' | 'atras') {
    clearTimeout(temporizador.current);
    setDireccion(dir);
    setPosicion(nuevo);
    setAviso('');
    document.querySelector('.plan')?.scrollTo?.(0, 0);
  }

  function guardar(nuevos: DatosFicha) {
    setDatos(nuevos);
    setAviso('');
    try {
      localStorage.setItem(claveBorrador(usuarioId), JSON.stringify(nuevos));
    } catch {
      /* sin almacenamiento */
    }
  }

  function cambiar(clave: string, valor: string | string[] | boolean) {
    const nuevos = { ...datos, [clave]: valor };
    guardar(nuevos);
    clearTimeout(temporizador.current);
    if (porPregunta && avanzaSola(actual.campos) && !vacio(valor)) {
      // Con la respuesta nueva pueden aparecer o desaparecer preguntas: se busca la siguiente con esos datos
      const siguientes = pantallasFicha(nuevos);
      const aqui = siguientes.findIndex((p) => p.clave === actual.clave);
      if (aqui >= 0 && aqui < siguientes.length - 1) {
        temporizador.current = setTimeout(() => irA(aqui + 1, 'adelante'), PAUSA_AVANCE);
      }
    }
  }

  async function siguiente() {
    const falta = faltantes(actual, datos);
    if (falta.length) {
      setAviso(
        porPregunta && actual.campos.length === 1 ? 'Esta pregunta es obligatoria.' : `Completa: ${falta.join(', ')}`,
      );
      return;
    }
    if (!esUltimo) {
      irA(indice + 1, 'adelante');
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

  const sinRespuesta = actual.campos.every((c) => vacio(datos[c.clave]));
  const opcional = actual.campos.every((c) => !c.requerido);
  const textoBoton = enviando
    ? 'Enviando…'
    : esUltimo
      ? textoEnviar
      : porPregunta && opcional && sinRespuesta
        ? 'Omitir'
        : 'Siguiente';

  return (
    <form
      className={`ficha ${porPregunta ? 'ficha-una' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        siguiente();
      }}
    >
      {porPregunta ? (
        <div
          className="ficha-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={pantallas.length}
          aria-valuenow={indice}
          aria-label={`Pregunta ${indice + 1} de ${pantallas.length}`}
        >
          <span style={{ width: `${(indice / pantallas.length) * 100}%` }} />
        </div>
      ) : (
        <div className="ficha-progreso" aria-label={`Paso ${indice + 1} de ${pantallas.length}`}>
          {pantallas.map((p, i) => (
            <span key={p.clave} className={i <= indice ? 'hecho' : ''} />
          ))}
        </div>
      )}

      <div key={actual.clave} className={`ficha-pregunta ${direccion}`}>
        {porPregunta ? (
          <>
            <p className="ficha-paso">
              {actual.paso.titulo} · {actual.numeroPaso} de {actual.totalPasos}
            </p>
            {actual.primeraDelPaso && actual.paso.descripcion && (
              <p className="ficha-descripcion">{actual.paso.descripcion}</p>
            )}
            {actual.campos.length > 1 && <h2 className="ficha-titulo">{actual.paso.titulo}</h2>}
          </>
        ) : (
          <>
            <p className="ficha-paso">
              Paso {indice + 1} de {pantallas.length}
            </p>
            <h2 className="ficha-titulo">{actual.paso.titulo}</h2>
            {actual.paso.descripcion && <p className="ficha-descripcion">{actual.paso.descripcion}</p>}
          </>
        )}

        {actual.campos.map((c, i) => (
          <CampoFichaInput
            key={c.clave}
            campo={c}
            datos={datos}
            onCambiar={cambiar}
            autoFoco={porPregunta && i === 0 && indice > 0}
          />
        ))}
      </div>

      {aviso && <p className="aviso-error">{aviso}</p>}

      <div className="ficha-botones">
        {indice > 0 && (
          <button type="button" className="boton secundario" onClick={() => irA(indice - 1, 'atras')}>
            Atrás
          </button>
        )}
        <button type="submit" className={`boton ${textoBoton === 'Omitir' ? 'secundario' : ''}`} disabled={enviando}>
          {textoBoton}
        </button>
      </div>
    </form>
  );
}

export default FichaFormulario;
