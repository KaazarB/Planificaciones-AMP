// Capa de componentes: la planificación de un atleta (la usa el atleta y, en modo lectura, el coach)

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Dia, Plan, TipoDia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';
import { DIAS_REVISION } from '../data/revision';
import { diasEntre } from '../domain/fechas';
import { tieneDatos } from '../domain/metricas';
import { aTextoISO, lunesDe, sumarDias, textoMes } from '../domain/semanas';
import { cargarPlan } from '../services/plan';
import { guardarLocal, leerLocales, leerRegistrosNube, sincronizar, subirRegistro } from '../services/registros';
import type { Videos } from '../services/videos';
import { leerVideos } from '../services/videos';
import '../pages/Tab1.css';

import Calendario from './Calendario';
import RegistroCierre from './RegistroCierre';
import RevisionBloque from './RevisionBloque';
import SeccionPlan from './SeccionPlan';
import SesionLibre from './SesionLibre';

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

type EstadoGuardado = 'listo' | 'guardando' | 'nube' | 'local';

interface Props {
  atleta: string; // id del atleta
  apodo: string;
  soloLectura?: boolean; // vista del coach: muestra todo sin poder modificar
  onCambiarApodo?: () => void;
}

function IndicadorGuardado({ guardado }: { guardado: EstadoGuardado }) {
  return (
    <div className="controles">
      <span className={`estado-guardado ${guardado}`}>
        {guardado === 'guardando' && 'Guardando…'}
        {guardado === 'nube' && 'Guardado ✓'}
        {guardado === 'local' && 'Guardado en el teléfono'}
      </span>
    </div>
  );
}

function PlanVista({ atleta, apodo, soloLectura = false, onCambiarApodo }: Props): React.JSX.Element {
  const hoy = aTextoISO(new Date());

  const [plan, setPlan] = useState<Plan | null>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [videos, setVideos] = useState<Videos>(new Map());
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [registros, setRegistros] = useState<Record<string, RegistroDia>>(() =>
    soloLectura ? {} : leerLocales(atleta),
  );
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
      .catch((e: Error) => setError(e.message || 'No se pudo cargar el plan.'));
    if (soloLectura) leerRegistrosNube(atleta).then(setRegistros);
    else sincronizar(atleta).then(({ registros: r }) => setRegistros(r));
    leerVideos()
      .then(setVideos)
      .catch(() => undefined);
  }, [atleta, hoy, soloLectura]);

  const lunes = lunesDe(aFecha(fecha));
  const semana = Array.from({ length: 7 }, (_, k) => aTextoISO(sumarDias(lunes, k)));
  const porFecha = useMemo(() => new Map((plan?.dias ?? []).map((d) => [d.fecha, d])), [plan]);
  const dia: Dia | undefined = porFecha.get(fecha);
  const registro = registros[fecha] ?? registroVacio(fecha);

  // Nombres de ejercicios del plan para autocompletar la sesión libre
  const sugerencias = useMemo(() => {
    const nombres = new Set<string>();
    for (const d of plan?.dias ?? [])
      for (const sec of d.secciones ?? []) for (const it of sec.items) if (it.series) nombres.add(it.nombre);
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
  }, [plan]);

  const registrados = useMemo(
    () => new Set(Object.keys(registros).filter((f) => tieneDatos(registros[f]))),
    [registros],
  );

  function elegirDia(f: string) {
    setFecha(f);
    setAbiertas(new Set());
  }

  // Se puede ir a cualquier semana: los días fuera del plan sirven para registrar entrenamientos libres
  function moverSemana(delta: number) {
    elegirDia(aTextoISO(sumarDias(lunes, delta * 7)));
  }

  function cambiar(cambio: Partial<RegistroDia>) {
    if (soloLectura) return;
    const nuevo: RegistroDia = { ...registro, ...cambio, fecha, actualizado: new Date().toISOString() };
    setRegistros((r) => ({ ...r, [fecha]: nuevo }));
    guardarLocal(atleta, nuevo);
    setGuardado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      setGuardado((await subirRegistro(atleta, nuevo)) ? 'nube' : 'local');
    }, 800);
  }

  // Botón «Registrar sesión»: guarda al tiro (sin esperar) y avisa si llegó a la nube
  async function registrarSesion(): Promise<boolean> {
    if (soloLectura) return false;
    window.clearTimeout(temporizador.current);
    const ahora = new Date().toISOString();
    const nuevo: RegistroDia = { ...registro, fecha, cerrada: ahora, actualizado: ahora };
    setRegistros((r) => ({ ...r, [fecha]: nuevo }));
    guardarLocal(atleta, nuevo);
    setGuardado('guardando');
    const ok = await subirRegistro(atleta, nuevo);
    setGuardado(ok ? 'nube' : 'local');
    return ok;
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

  if (error) return <p className="aviso">{error}</p>;

  const antesDelBloque = plan && hoy < plan.bloque.inicio;
  // Revisión de fin de bloque: cuando al último bloque cargado le quedan pocos días
  const ultimoDia = plan?.dias[plan.dias.length - 1];
  const pedirRevision =
    !soloLectura &&
    ultimoDia &&
    diasEntre(hoy, ultimoDia.fecha) <= DIAS_REVISION &&
    diasEntre(hoy, ultimoDia.fecha) >= -21;
  const despuesDelBloque = plan && hoy > plan.bloque.fin;

  return (
    <>
      <header className="plan-cabecera">
        <h1>
          Planificación{' '}
          {onCambiarApodo ? (
            <button className="apodo" onClick={onCambiarApodo} aria-label="Cambiar mi nombre">
              {apodo}
            </button>
          ) : (
            apodo
          )}
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
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
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
              {(!d || d.tipo === 'descanso') && registrado && (
                <span className="punto libre registrado" aria-hidden="true" />
              )}
            </button>
          );
        })}
        <button className="flecha" onClick={() => moverSemana(1)} aria-label="Semana siguiente">
          ›
        </button>
      </nav>

      {pedirRevision && ultimoDia && <RevisionBloque atleta={atleta} bloque={ultimoDia.bloque} fin={ultimoDia.fecha} />}
      {antesDelBloque && plan && (
        <p className="aviso">
          El bloque {plan.bloque.numero} empieza el{' '}
          {minuscula(porFecha.get(plan.bloque.inicio)?.dia ?? plan.dias[0].dia)}. Puedes revisar las sesiones desde ya.
        </p>
      )}
      {despuesDelBloque && plan && (
        <p className="aviso">
          El bloque {plan.bloque.numero} terminó el{' '}
          {minuscula(porFecha.get(plan.bloque.fin)?.dia ?? plan.dias[plan.dias.length - 1].dia)}.
        </p>
      )}

      {!plan && !sinPlan && <p className="cargando">Cargando planificación…</p>}
      {sinPlan && (
        <p className="aviso">
          {soloLectura
            ? 'Todavía no tiene planes cargados.'
            : 'Tu coach todavía no carga tu plan. Cuando lo haga, aparecerá aquí.'}
        </p>
      )}

      {!dia && (plan || sinPlan) && (
        <article>
          {(soloLectura || registro.libre) && (
            <p className="cargando">
              No hay nada planificado para este día.
              {soloLectura && !registro.libre && ' Tampoco registró un entrenamiento libre.'}
            </p>
          )}
          {!soloLectura && registro.libre && <IndicadorGuardado guardado={guardado} />}
          <SesionLibre
            registro={registro}
            onCambiar={cambiar}
            onRegistrar={registrarSesion}
            sugerencias={sugerencias}
            soloLectura={soloLectura}
          />
        </article>
      )}

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
              {soloLectura && (registrados.has(fecha) ? 'Registró este día' : 'Sin registro este día')}
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
              soloLectura={soloLectura}
            />
          ))}

          <RegistroCierre
            dia={dia}
            reglas={plan?.reglas}
            abierta={abiertas.has('registro')}
            registro={registro}
            onAlternar={() => alternar('registro')}
            onCambiar={cambiar}
            onRegistrar={registrarSesion}
            soloLectura={soloLectura}
          />

          {/* Todos los días: entrenamiento extra (o «entrené igual» en descanso y viaje) */}
          <SesionLibre
            registro={registro}
            onCambiar={cambiar}
            sugerencias={sugerencias}
            conCierre
            extra={dia.tipo !== 'descanso' && dia.tipo !== 'viaje'}
            soloLectura={soloLectura}
          />
        </article>
      )}
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
    </>
  );
}

export default PlanVista;
