// Capa de pantallas: Planificación (replica la planilla original)

import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import Calendario from '../components/Calendario';
import RegistroCierre from '../components/RegistroCierre';
import SeccionPlan from '../components/SeccionPlan';
import { useCuenta } from '../context/Cuenta';
import type { Dia, Plan, TipoDia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';
import { aTextoISO, lunesDe, sumarDias, textoMes } from '../domain/semanas';
import { guardarApodo } from '../services/cuenta';
import { cargarPlan } from '../services/plan';
import { guardarLocal, leerLocales, sincronizar, subirRegistro } from '../services/registros';
import type { Videos } from '../services/videos';
import { leerVideos } from '../services/videos';
import './Tab1.css';

const etiquetaTipo: Record<TipoDia, string> = {
  sesion: 'Sesión',
  clase: 'Clase',
  carrera: 'Carrera',
  viaje: 'Viaje',
  descanso: 'Descanso',
};
const letrasDia = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const aFecha = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};
const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function tieneDatos(r?: RegistroDia) {
  if (!r) return false;
  return Boolean(
    r.rpe !== undefined ||
    r.notas ||
    r.clase ||
    Object.values(r.checks).some(Boolean) ||
    Object.values(r.campos).some(Boolean) ||
    Object.values(r.series).some((filas) => filas.some((f) => f && (f.kg || f.reps || f.seg))),
  );
}

type EstadoGuardado = 'listo' | 'guardando' | 'nube' | 'local';

function Tab1(): React.JSX.Element {
  const { perfil, cambiarPerfil } = useCuenta();
  const atleta = perfil?.id ?? '';
  const hoy = aTextoISO(new Date());

  const [plan, setPlan] = useState<Plan | null>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [videos, setVideos] = useState<Videos>(new Map());
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [registros, setRegistros] = useState<Record<string, RegistroDia>>(() => leerLocales(atleta));
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [guardado, setGuardado] = useState<EstadoGuardado>('listo');
  const [calendario, setCalendario] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => {
    cargarPlan(atleta)
      .then((p) => {
        if (!p) {
          setSinPlan(true);
          return;
        }
        setPlan(p);
        const { inicio, fin } = p.bloque;
        setFecha(hoy < inicio ? inicio : hoy > fin ? fin : hoy);
      })
      .catch((e: Error) => setError(e.message || 'No se pudo cargar tu plan.'));
    sincronizar(atleta).then(({ registros: r }) => setRegistros(r));
    leerVideos()
      .then(setVideos)
      .catch(() => undefined);
  }, [atleta, hoy]);

  const lunes = lunesDe(aFecha(fecha));
  const semana = Array.from({ length: 7 }, (_, k) => aTextoISO(sumarDias(lunes, k)));
  const porFecha = useMemo(() => new Map((plan?.dias ?? []).map((d) => [d.fecha, d])), [plan]);
  const dia: Dia | undefined = porFecha.get(fecha);
  const registro = registros[fecha] ?? registroVacio(fecha);

  const apodo = perfil?.apodo || perfil?.nombre.split(' ')[0] || '';

  function cambiarApodo() {
    const nuevo = window.prompt('¿Cómo quieres que aparezca tu nombre?', apodo)?.trim();
    if (!nuevo) return;
    const corto = nuevo.slice(0, 16);
    cambiarPerfil({ apodo: corto });
    guardarApodo(atleta, corto).catch(() => undefined);
  }

  const registrados = useMemo(
    () => new Set(Object.keys(registros).filter((f) => tieneDatos(registros[f]))),
    [registros],
  );

  function elegirDia(f: string) {
    setFecha(f);
    setAbiertas(new Set());
  }

  function moverSemana(delta: number) {
    if (!plan) return;
    const destino = aTextoISO(sumarDias(lunes, delta * 7));
    const finSemana = aTextoISO(sumarDias(aFecha(destino), 6));
    const primero = plan.dias[0].fecha;
    const ultimo = plan.dias[plan.dias.length - 1].fecha;
    if (finSemana < primero || destino > ultimo) return;
    elegirDia(destino < primero ? primero : destino);
  }

  function cambiar(cambio: Partial<RegistroDia>) {
    const nuevo: RegistroDia = { ...registro, ...cambio, fecha, actualizado: new Date().toISOString() };
    setRegistros((r) => ({ ...r, [fecha]: nuevo }));
    guardarLocal(atleta, nuevo);
    setGuardado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      setGuardado((await subirRegistro(atleta, nuevo)) ? 'nube' : 'local');
    }, 800);
  }

  function alternar(clave: string) {
    setAbiertas((a) => {
      const n = new Set(a);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });
  }

  const clavesDelDia = dia ? [...(dia.secciones ?? []).map((_, i) => `s${i}`), 'registro'] : [];

  if (error) {
    return (
      <IonPage>
        <IonContent className="plan">
          <div className="plan-envoltura">
            <p className="aviso">{error}</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const antesDelBloque = plan && hoy < plan.bloque.inicio;
  const despuesDelBloque = plan && hoy > plan.bloque.fin;

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          <header className="plan-cabecera">
            <h1>
              Planificación{' '}
              <button className="apodo" onClick={cambiarApodo} aria-label="Cambiar mi nombre">
                {apodo}
              </button>
            </h1>
          </header>

          <div className="plan-subcabecera">
            <span className="plan-mes">{textoMes(aFecha(fecha))}</span>
            {dia && (
              <span className="plan-bloque">
                Bloque {dia.bloque} · Semana {dia.semana}
              </span>
            )}
            <button className="boton-calendario" onClick={() => setCalendario(true)} aria-label="Abrir calendario">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <rect
                  x="3.5"
                  y="5"
                  width="17"
                  height="15.5"
                  rx="2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="8.5" cy="14" r="1.1" fill="currentColor" />
                <circle cx="12" cy="14" r="1.1" fill="currentColor" />
                <circle cx="15.5" cy="14" r="1.1" fill="currentColor" />
                <circle cx="8.5" cy="17.3" r="1.1" fill="currentColor" />
                <circle cx="12" cy="17.3" r="1.1" fill="currentColor" />
              </svg>
            </button>
          </div>

          <nav className="tira-dias" aria-label="Días de la semana">
            <button className="flecha" onClick={() => moverSemana(-1)} aria-label="Semana anterior">
              ‹
            </button>
            {semana.map((f, k) => {
              const d = porFecha.get(f);
              const registrado = registrados.has(f);
              return (
                <button
                  key={f}
                  className={`chip-dia ${f === fecha ? 'activo' : ''} ${f === hoy ? 'hoy' : ''} ${d ? '' : 'vacio'}`}
                  onClick={() => elegirDia(f)}
                  aria-pressed={f === fecha}
                  aria-label={d ? d.dia : f}
                >
                  <span className="letra">{letrasDia[k]}</span>
                  <span className="numero">{aFecha(f).getDate()}</span>
                  {d && d.tipo !== 'descanso' && (
                    <span className={`punto ${d.tipo} ${registrado ? 'registrado' : ''}`} aria-hidden="true" />
                  )}
                </button>
              );
            })}
            <button className="flecha" onClick={() => moverSemana(1)} aria-label="Semana siguiente">
              ›
            </button>
          </nav>

          {antesDelBloque && plan && (
            <p className="aviso">
              El bloque {plan.bloque.numero} empieza el{' '}
              {minuscula(porFecha.get(plan.bloque.inicio)?.dia ?? plan.dias[0].dia)}. Puedes revisar las sesiones desde
              ya.
            </p>
          )}
          {despuesDelBloque && plan && (
            <p className="aviso">
              El bloque {plan.bloque.numero} terminó el{' '}
              {minuscula(porFecha.get(plan.bloque.fin)?.dia ?? plan.dias[plan.dias.length - 1].dia)}.
            </p>
          )}

          {!plan && !sinPlan && <p className="cargando">Cargando planificación…</p>}
          {sinPlan && <p className="aviso">Tu coach todavía no carga tu plan. Cuando lo haga, aparecerá aquí.</p>}

          {plan && !dia && <p className="cargando">No hay nada planificado para este día.</p>}

          {dia && (
            <article>
              <h2 className="dia-titulo">{dia.titulo}</h2>
              <div className="dia-meta">
                <span className={`etiqueta ${dia.tipo}`}>{etiquetaTipo[dia.tipo]}</span>
                <span>
                  {dia.dia} · Semana {dia.semana}: {dia.fase}
                </span>
              </div>
              <p className="dia-objetivo">{dia.objetivo}</p>

              <div className="controles">
                <span className={`estado-guardado ${guardado}`}>
                  {guardado === 'guardando' && 'Guardando…'}
                  {guardado === 'nube' && 'Guardado ✓'}
                  {guardado === 'local' && 'Guardado en el teléfono'}
                </span>
                <button onClick={() => setAbiertas(new Set(clavesDelDia))}>Abrir todo</button>
                <span aria-hidden="true">·</span>
                <button onClick={() => setAbiertas(new Set())}>Cerrar todo</button>
              </div>

              {(dia.secciones ?? []).map((s, i) => (
                <SeccionPlan
                  key={`${fecha}-${i}`}
                  seccion={s}
                  indice={i}
                  abierta={abiertas.has(`s${i}`)}
                  registro={registro}
                  onAlternar={() => alternar(`s${i}`)}
                  onCambiar={cambiar}
                  videos={videos}
                />
              ))}

              <RegistroCierre
                dia={dia}
                reglas={plan?.reglas}
                abierta={abiertas.has('registro')}
                registro={registro}
                onAlternar={() => alternar('registro')}
                onCambiar={cambiar}
              />
            </article>
          )}
        </div>
        {calendario && (
          <Calendario
            fecha={fecha}
            hoy={hoy}
            porFecha={porFecha}
            registrados={registrados}
            onElegir={(f) => {
              elegirDia(f);
              setCalendario(false);
            }}
            onCerrar={() => setCalendario(false)}
          />
        )}
      </IonContent>
    </IonPage>
  );
}

export default Tab1;
