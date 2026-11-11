// Capa de componentes: el atleta arma el WOD que hizo, paso a paso
// (formato → tiempo → rondas → ejercicios → peso). Se guarda a medida que escribe.

import { useEffect, useRef, useState } from 'react';

import type { EjercicioWod, SesionLibre, WodArmado } from '../data/registro';
import type { CampoPaso } from '../domain/wod';
import {
  FORMATOS_WOD,
  PASOS_WOD,
  limpiarWod,
  movimientosSugeridos,
  partesTiempo,
  preguntaRondas,
  preguntaTiempo,
  resultadoWod,
  tituloWod,
  unirTiempo,
  wodNuevo,
  wodTieneDatos,
} from '../domain/wod';

const PAUSA_AVANCE = 380; // ms: alcanza a verse el formato marcado antes de pasar al paso siguiente
const soloDigitos = (v: string) => v.replace(/\D/g, '');
const lleno = (v?: string) => Boolean(v?.trim());

// Tarjeta con el WOD ya armado (la ve el atleta y, en modo lectura, el coach)
function ResumenWod({ wod }: { wod: WodArmado }): React.JSX.Element {
  const ejercicios = wod.ejercicios.filter((e) => lleno(e.nombre) || lleno(e.reps));
  const resultado = resultadoWod(wod);
  return (
    <div className="wod-resumen" role="group" aria-label="WOD armado">
      <p className="wod-resumen-titulo">{tituloWod(wod)}</p>
      {ejercicios.length > 0 && (
        <ul>
          {ejercicios.map((e, i) => (
            <li key={i}>
              <span className="wod-r">{e.reps}</span>
              <span className="wod-n">{e.nombre}</span>
              {lleno(e.kg) && <span className="wod-kg">{e.kg} kg</span>}
            </li>
          ))}
        </ul>
      )}
      {resultado && <p className="wod-resumen-resultado">{resultado}</p>}
    </div>
  );
}

interface PropsAsistente {
  wod: WodArmado;
  nuevo: boolean; // recién empezado: «Cancelar» lo descarta
  onCambiar: (w: WodArmado) => void;
  onListo: () => void;
  onCancelar: () => void;
  idLista: string;
}

function Asistente({ wod, nuevo, onCambiar, onListo, onCancelar, idLista }: PropsAsistente): React.JSX.Element {
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState<'adelante' | 'atras'>('adelante');
  const [aviso, setAviso] = useState('');
  const caja = useRef<HTMLDivElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Si el paso nuevo empieza fuera de la pantalla (lista larga), se sube hasta el inicio del asistente
  useEffect(() => {
    const el = caja.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [paso]);

  const ultimo = paso === PASOS_WOD.length - 1;
  const cambiar = (c: Partial<WodArmado>) => {
    setAviso('');
    onCambiar({ ...wod, ...c });
  };

  function irA(nuevoPaso: number) {
    clearTimeout(temporizador.current);
    if (nuevoPaso > 0 && !wod.formato) {
      setAviso('Elige el formato para seguir.');
      return;
    }
    setDireccion(nuevoPaso >= paso ? 'adelante' : 'atras');
    setPaso(nuevoPaso);
    setAviso('');
  }

  function siguiente() {
    if (ultimo) onListo();
    else irA(paso + 1);
  }

  function elegirFormato(formato: string) {
    onCambiar({ ...wod, formato });
    setAviso('');
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setDireccion('adelante');
      setPaso(1);
    }, PAUSA_AVANCE);
  }

  const cambiarEjercicio = (i: number, c: Partial<EjercicioWod>) =>
    cambiar({ ejercicios: wod.ejercicios.map((e, k) => (k === i ? { ...e, ...c } : e)) });

  const alEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      siguiente();
    }
  };

  // Un dato de los pasos «Tiempo» o «Rondas» (el tiempo final va en dos casillas: min y seg)
  function campoDelPaso(c: CampoPaso, primero: boolean, sugerido = '') {
    if (c.clave === 'tiempo') {
      const { min, seg } = partesTiempo(wod.tiempo);
      return (
        <div key={c.clave} className="wod-campo" role="group" aria-label={c.etiqueta}>
          <span className="wod-etiqueta">{c.etiqueta}</span>
          <div className="wod-minseg">
            <label className="campo">
              <input
                inputMode="numeric"
                autoFocus={primero}
                value={min}
                onChange={(e) => cambiar({ tiempo: unirTiempo(soloDigitos(e.target.value), seg) })}
                onKeyDown={alEnter}
                aria-label="Minutos"
              />
              <span>min</span>
            </label>
            <label className="campo">
              <input
                inputMode="numeric"
                maxLength={2}
                value={seg}
                onChange={(e) => cambiar({ tiempo: unirTiempo(min, soloDigitos(e.target.value)) })}
                onKeyDown={alEnter}
                aria-label="Segundos"
              />
              <span>seg</span>
            </label>
          </div>
        </div>
      );
    }
    const entero = c.clave === 'rondas' || c.clave === 'repsExtra';
    return (
      <label key={c.clave} className="wod-campo">
        <span className="wod-etiqueta">{c.etiqueta}</span>
        <span className="campo wod-corto">
          <input
            inputMode={entero ? 'numeric' : 'decimal'}
            autoFocus={primero}
            placeholder={sugerido}
            value={wod[c.clave] ?? ''}
            onChange={(e) => cambiar({ [c.clave]: e.target.value })}
            onKeyDown={alEnter}
            aria-label={c.etiqueta}
          />
          <span>{c.unidad}</span>
        </span>
      </label>
    );
  }

  // Lo que muestra cada paso
  let pregunta: string;
  let ayuda: string | undefined;
  let contenido: React.ReactNode;
  let vacio = false; // paso sin nada anotado: el botón dice «Omitir»

  if (paso === 0) {
    pregunta = '¿Qué formato tenía el WOD?';
    contenido = (
      <div className="wod-opciones" role="radiogroup" aria-label="Formato del WOD">
        {FORMATOS_WOD.map((f) => (
          <button
            key={f.nombre}
            type="button"
            role="radio"
            aria-checked={wod.formato === f.nombre}
            className={`tarjeta-opcion ${wod.formato === f.nombre ? 'elegido' : ''}`}
            onClick={() => elegirFormato(f.nombre)}
          >
            <strong>{f.nombre}</strong>
            <span>{f.ayuda}</span>
          </button>
        ))}
      </div>
    );
  } else if (paso === 1 || paso === 2) {
    const p = paso === 1 ? preguntaTiempo(wod) : preguntaRondas(wod);
    pregunta = p.pregunta;
    ayuda = p.ayuda;
    // En un EMOM, lo normal es una ronda por minuto
    const sugerido = (c: CampoPaso) =>
      wod.formato === 'EMOM' && c.clave === 'rondas' && /^\d+$/.test(wod.minutos?.trim() ?? '')
        ? wod.minutos!.trim()
        : '';
    contenido = p.campos.map((c, i) => campoDelPaso(c, i === 0, sugerido(c)));
    vacio = !p.campos.some((c) => (c.clave === 'tiempo' ? /\d/.test(wod.tiempo ?? '') : lleno(wod[c.clave])));
  } else if (paso === 3) {
    pregunta = '¿Qué ejercicios tenía?';
    ayuda = 'Repeticiones por ronda y el ejercicio. También sirve 21-15-9, 200 m o 15 cal.';
    const primerVacio = wod.ejercicios.findIndex((e) => !lleno(e.nombre) && !lleno(e.reps));
    contenido = (
      <div className="wod-ejercicios">
        <div className="wod-columnas" aria-hidden="true">
          <span>Reps</span>
          <span>Ejercicio</span>
        </div>
        {wod.ejercicios.map((e, i) => (
          <div key={i} className="wod-ejercicio">
            <input
              className="wod-reps"
              autoFocus={i === primerVacio}
              placeholder="10"
              value={e.reps ?? ''}
              onChange={(ev) => cambiarEjercicio(i, { reps: ev.target.value })}
              aria-label={`Repeticiones del ejercicio ${i + 1}`}
            />
            <input
              className="wod-nombre"
              list={idLista}
              placeholder={i === 0 ? 'ej. Wall ball' : 'Ejercicio'}
              value={e.nombre}
              onChange={(ev) => cambiarEjercicio(i, { nombre: ev.target.value })}
              aria-label={`Ejercicio ${i + 1} del WOD`}
            />
            <button
              type="button"
              className="libre-x"
              onClick={() => cambiar({ ejercicios: wod.ejercicios.filter((_, k) => k !== i) })}
              aria-label={`Quitar ${e.nombre || `ejercicio ${i + 1}`}`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="boton secundario ancho"
          onClick={() => cambiar({ ejercicios: [...wod.ejercicios, { nombre: '' }] })}
        >
          ＋ Agregar ejercicio al WOD
        </button>
      </div>
    );
    vacio = !wod.ejercicios.some((e) => lleno(e.nombre) || lleno(e.reps));
  } else {
    pregunta = '¿Con cuánto peso?';
    ayuda = 'Deja vacío lo que hiciste sin peso. Con mancuernas o kettlebells, anota el peso de cada una.';
    const conNombre = wod.ejercicios.map((e, i) => ({ e, i })).filter(({ e }) => lleno(e.nombre));
    contenido = conNombre.length ? (
      <div className="wod-pesos">
        {conNombre.map(({ e, i }, k) => (
          <div key={i} className="wod-peso">
            <span className="wod-peso-nombre">
              {lleno(e.reps) && <span className="wod-peso-reps">{e.reps} </span>}
              {e.nombre}
            </span>
            <label className="campo wod-kg-campo">
              <input
                inputMode="decimal"
                autoFocus={k === 0}
                value={e.kg ?? ''}
                onChange={(ev) => cambiarEjercicio(i, { kg: ev.target.value })}
                aria-label={`Peso de ${e.nombre}`}
              />
              <span>kg</span>
            </label>
          </div>
        ))}
      </div>
    ) : (
      <p className="wod-ayuda wod-falta">Primero anota los ejercicios en el paso anterior.</p>
    );
  }

  const textoBoton = ultimo ? 'Listo' : paso > 0 && vacio ? 'Omitir' : 'Siguiente';

  return (
    <div ref={caja} className="wod-armado">
      <div className="wod-cabeza">
        <span className="wod-titulo">Arma tu WOD</span>
        <span className="wod-num">
          Paso {paso + 1} de {PASOS_WOD.length}
        </span>
      </div>
      <nav className="wod-pasos" aria-label="Pasos del WOD">
        {PASOS_WOD.map((nombre, i) => (
          <button
            key={nombre}
            type="button"
            className={i === paso ? 'actual' : i < paso ? 'hecho' : ''}
            aria-current={i === paso ? 'step' : undefined}
            onClick={() => irA(i)}
          >
            {nombre}
          </button>
        ))}
      </nav>

      <div key={paso} className={`wod-paso ${direccion}`}>
        <h3 className="wod-pregunta">{pregunta}</h3>
        {ayuda && <p className="wod-ayuda">{ayuda}</p>}
        {contenido}
      </div>

      {aviso && <p className="aviso-error">{aviso}</p>}

      <div className="wod-botones">
        <button
          type="button"
          className="boton secundario"
          onClick={() => (paso === 0 ? (nuevo ? onCancelar() : onListo()) : irA(paso - 1))}
        >
          {paso === 0 ? (nuevo ? 'Cancelar' : 'Cerrar') : 'Atrás'}
        </button>
        <button type="button" className={`boton ${textoBoton === 'Omitir' ? 'secundario' : ''}`} onClick={siguiente}>
          {textoBoton}
        </button>
      </div>
    </div>
  );
}

interface Props {
  sesion: SesionLibre;
  onCambiar: (c: Partial<SesionLibre>) => void;
  sugerencias?: string[]; // ejercicios del plan, para autocompletar
  fecha: string;
  soloLectura?: boolean;
}

// Zona «WOD» del entrenamiento libre cuando eligió «Clase CrossFit»
function WodPasoAPaso({ sesion, onCambiar, sugerencias = [], fecha, soloLectura = false }: Props): React.JSX.Element {
  const [armando, setArmando] = useState<'nuevo' | 'editar' | null>(null);
  const [quitando, setQuitando] = useState(false);
  const guardado = sesion.wodArmado;
  const wod = guardado && { ...guardado, ejercicios: guardado.ejercicios ?? [] };
  const idLista = `movimientos-${fecha}`;

  const notas = (etiqueta: string, placeholder: string) => (
    <label className="campo-texto">
      <span>{etiqueta}</span>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={sesion.wod ?? ''}
        onChange={(e) => onCambiar({ wod: e.target.value })}
      />
    </label>
  );

  if (wod && armando && !soloLectura) {
    return (
      <>
        <datalist id={idLista}>
          {movimientosSugeridos(sugerencias).map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Asistente
          wod={wod}
          nuevo={armando === 'nuevo'}
          idLista={idLista}
          onCambiar={(w) => onCambiar({ wodArmado: w })}
          onListo={() => {
            setArmando(null);
            onCambiar({ wodArmado: limpiarWod(wod) });
          }}
          onCancelar={() => {
            setArmando(null);
            onCambiar({ wodArmado: undefined });
          }}
        />
      </>
    );
  }

  if (wod && wodTieneDatos(wod)) {
    return (
      <>
        <div className="campo-texto">
          <span>WOD</span>
        </div>
        <ResumenWod wod={wod} />
        {!soloLectura &&
          (quitando ? (
            <p className="wod-confirmar">
              ¿Quitar este WOD?{' '}
              <button
                type="button"
                className="enlace peligro"
                onClick={() => {
                  setQuitando(false);
                  onCambiar({ wodArmado: undefined });
                }}
              >
                Sí, quitar
              </button>{' '}
              ·{' '}
              <button type="button" className="enlace" onClick={() => setQuitando(false)}>
                No
              </button>
            </p>
          ) : (
            <div className="wod-acciones">
              <button type="button" className="enlace" onClick={() => setArmando('editar')}>
                Editar WOD
              </button>
              <button type="button" className="enlace peligro" onClick={() => setQuitando(true)}>
                Quitar
              </button>
            </div>
          ))}
        {(!soloLectura || lleno(sesion.wod)) &&
          notas('Notas del WOD (opcional)', 'ej. lo hice escalado, me costó el final…')}
      </>
    );
  }

  return (
    <>
      {!soloLectura && (
        <div className="wod-invitacion">
          <p>
            <strong>Arma tu WOD paso a paso</strong>
            Formato, tiempo, rondas, ejercicios y peso.
          </p>
          <button
            type="button"
            className="boton ancho"
            onClick={() => {
              setArmando('nuevo');
              onCambiar({ wodArmado: wod ?? wodNuevo() });
            }}
          >
            ＋ Armar WOD paso a paso
          </button>
        </div>
      )}
      {notas(
        soloLectura ? 'WOD o qué hiciste' : 'O escríbelo a tu manera',
        'ej. AMRAP 12 min: 10 wall balls, 10 burpees → 6 rondas + 4',
      )}
    </>
  );
}

export default WodPasoAPaso;
