// Capa de componentes: entrenamiento libre — el atleta arma y registra una sesión
// en un día sin planificación (o en un día de descanso en que igual entrenó)

import { useState } from 'react';

import type { EjercicioLibre, FilaSerie, RegistroDia, SesionLibre as Sesion } from '../data/registro';
import { sesionNueva, TIPOS_LIBRE } from '../domain/libre';
import { TIPO_CROSSFIT } from '../domain/wod';

import { BotonRegistrar, Escala } from './RegistroCierre';
import WodPasoAPaso from './WodPasoAPaso';

interface Props {
  registro: RegistroDia;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
  sugerencias?: string[]; // nombres de ejercicios del plan, para autocompletar
  onRegistrar?: () => Promise<boolean>; // botón «Registrar sesión» (solo si el día no tiene su propio cierre)
  conCierre?: boolean; // el día ya tiene «Registro al terminar» (notas propias): no se repiten aquí
  extra?: boolean; // día con entrenamiento planificado: se ofrece como «entrenamiento extra»
  destacado?: boolean; // día sin entrenamiento cargado: va antes del «Registro al terminar» y es lo principal
  soloLectura?: boolean;
}

function SesionLibre({
  registro,
  onCambiar,
  sugerencias = [],
  onRegistrar,
  conCierre = false,
  extra = false,
  destacado = false,
  soloLectura = false,
}: Props): React.JSX.Element | null {
  const sesion = registro.libre;
  const [borrando, setBorrando] = useState(false);

  if (!sesion) {
    if (soloLectura) return null;
    const comoExtra = extra && !destacado;
    return (
      <div className="libre-invitacion">
        <p>
          {comoExtra
            ? '¿Hiciste otro entrenamiento además del plan?'
            : extra
              ? '¿Entrenaste hoy? Anota lo que hiciste.'
              : conCierre
                ? '¿Entrenaste igual hoy?'
                : '¿Entrenaste por tu cuenta este día?'}
        </p>
        <button
          type="button"
          className={`boton ancho ${comoExtra ? 'secundario' : ''}`}
          onClick={() => onCambiar({ libre: sesionNueva() })}
        >
          {comoExtra ? '＋ Registrar entrenamiento extra' : '＋ Registrar un entrenamiento'}
        </button>
      </div>
    );
  }

  const cambiar = (c: Partial<Sesion>) => onCambiar({ libre: { ...sesion, ...c } });
  const cambiarEjercicio = (i: number, e: EjercicioLibre) =>
    cambiar({ ejercicios: sesion.ejercicios.map((x, k) => (k === i ? e : x)) });

  function escribir(i: number, k: number, campo: 'kg' | 'reps', valor: string) {
    const e = sesion!.ejercicios[i];
    cambiarEjercicio(i, { ...e, series: e.series.map((f, j) => (j === k ? { ...f, [campo]: valor } : f)) });
  }

  // Una serie nueva copia la anterior (lo normal es repetir el mismo peso y reps)
  function agregarSerie(i: number) {
    const e = sesion!.ejercicios[i];
    const ultima: FilaSerie = e.series[e.series.length - 1] ?? {};
    cambiarEjercicio(i, { ...e, series: [...e.series, { kg: ultima.kg, reps: ultima.reps }] });
  }

  function quitarSerie(i: number, k: number) {
    const e = sesion!.ejercicios[i];
    cambiarEjercicio(i, { ...e, series: e.series.filter((_, j) => j !== k) });
  }

  const idLista = `ejercicios-${registro.fecha}`;

  return (
    <section className="seccion abierta libre">
      <div className="seccion-barra libre-barra">
        <span className="seccion-titulo">{extra ? 'Entrenamiento extra' : 'Entrenamiento libre'}</span>
      </div>

      <fieldset className="seccion-cuerpo registro" disabled={soloLectura}>
        <div className="campo-texto">
          <span>Tipo de entrenamiento</span>
          <div className="libre-tipos" role="group" aria-label="Tipo de entrenamiento">
            {TIPOS_LIBRE.map((t) => (
              <button
                key={t}
                type="button"
                className={sesion.tipo === t ? 'elegido' : ''}
                onClick={() => cambiar({ tipo: sesion.tipo === t ? '' : t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="campo-texto libre-minutos">
          <span>Duración (minutos)</span>
          <input
            inputMode="numeric"
            placeholder="ej. 60"
            value={sesion.minutos ?? ''}
            onChange={(e) => cambiar({ minutos: e.target.value })}
          />
        </label>

        <div className="campo-texto">
          <span>Ejercicios con peso o repeticiones</span>
        </div>
        <datalist id={idLista}>
          {sugerencias.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {sesion.ejercicios.map((ej, i) => (
          <div key={i} className="libre-ejercicio">
            <div className="libre-ejercicio-cabeza">
              <input
                className="libre-nombre"
                list={idLista}
                placeholder="Ejercicio (ej. Back squat)"
                value={ej.nombre}
                onChange={(e) => cambiarEjercicio(i, { ...ej, nombre: e.target.value })}
                aria-label={`Nombre del ejercicio ${i + 1}`}
              />
              {!soloLectura && (
                <button
                  type="button"
                  className="libre-quitar"
                  onClick={() => cambiar({ ejercicios: sesion.ejercicios.filter((_, k) => k !== i) })}
                  aria-label={`Quitar ejercicio ${ej.nombre || i + 1}`}
                >
                  Quitar
                </button>
              )}
            </div>
            {ej.series.map((f, k) => (
              <div key={k} className="fila-serie">
                <span className="num-serie">{k + 1}</span>
                <label className="campo">
                  <input
                    inputMode="decimal"
                    value={f.kg ?? ''}
                    onChange={(e) => escribir(i, k, 'kg', e.target.value)}
                    aria-label={`${ej.nombre || 'Ejercicio'} serie ${k + 1} kg`}
                  />
                  <span>kg</span>
                </label>
                <label className="campo">
                  <input
                    inputMode="numeric"
                    value={f.reps ?? ''}
                    onChange={(e) => escribir(i, k, 'reps', e.target.value)}
                    aria-label={`${ej.nombre || 'Ejercicio'} serie ${k + 1} reps`}
                  />
                  <span>reps</span>
                </label>
                {!soloLectura && (
                  <button
                    type="button"
                    className="libre-x"
                    onClick={() => quitarSerie(i, k)}
                    aria-label={`Quitar serie ${k + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {!soloLectura && (
              <button type="button" className="enlace libre-mas-serie" onClick={() => agregarSerie(i)}>
                ＋ Serie
              </button>
            )}
          </div>
        ))}
        {!soloLectura && (
          <button
            type="button"
            className="boton secundario ancho libre-agregar"
            onClick={() => cambiar({ ejercicios: [...sesion.ejercicios, { nombre: '', series: [{}] }] })}
          >
            ＋ Agregar ejercicio
          </button>
        )}

        {/* Clase CrossFit: el WOD se puede armar paso a paso (formato, tiempo, rondas, ejercicios y peso) */}
        {sesion.tipo === TIPO_CROSSFIT || sesion.wodArmado ? (
          <WodPasoAPaso
            sesion={sesion}
            onCambiar={cambiar}
            sugerencias={sugerencias}
            fecha={registro.fecha}
            soloLectura={soloLectura}
          />
        ) : (
          <label className="campo-texto">
            <span>WOD o qué hiciste</span>
            <textarea
              rows={4}
              placeholder="ej. AMRAP 12 min: 10 wall balls, 10 burpees → 6 rondas + 4"
              value={sesion.wod ?? ''}
              onChange={(e) => cambiar({ wod: e.target.value })}
            />
          </label>
        )}

        {!conCierre && (
          <>
            <div className="campo-texto">
              <span>Esfuerzo de la sesión (1 = muy fácil, 10 = máximo)</span>
              <Escala
                desde={1}
                hasta={10}
                valor={registro.rpe}
                onElegir={(v) => onCambiar({ rpe: v })}
                etiqueta="RPE"
              />
            </div>
            <label className="campo-texto">
              <span>Notas y sensaciones</span>
              <textarea rows={3} value={registro.notas ?? ''} onChange={(e) => onCambiar({ notas: e.target.value })} />
            </label>
            {onRegistrar && <BotonRegistrar registro={registro} onRegistrar={onRegistrar} soloLectura={soloLectura} />}
          </>
        )}

        {!soloLectura &&
          (borrando ? (
            <p className="libre-borrar">
              ¿Borrar este entrenamiento?{' '}
              <button
                type="button"
                className="enlace peligro"
                onClick={() => {
                  setBorrando(false);
                  onCambiar({
                    libre: undefined,
                    ...(conCierre ? {} : { rpe: undefined, notas: undefined, cerrada: undefined }),
                  });
                }}
              >
                Sí, borrar
              </button>{' '}
              ·{' '}
              <button type="button" className="enlace" onClick={() => setBorrando(false)}>
                No
              </button>
            </p>
          ) : (
            <button type="button" className="enlace peligro libre-borrar" onClick={() => setBorrando(true)}>
              Borrar entrenamiento
            </button>
          ))}
      </fieldset>
    </section>
  );
}

export default SesionLibre;
