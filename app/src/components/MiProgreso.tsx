// Capa de componentes: el dashboard del atleta («Progreso»)
// Su semana (% y días cumplidos), semana a semana, y cómo avanza según lo que anota en la app.

import { useMemo } from 'react';

import type { DatosFicha } from '../data/ficha';
import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import type { DiaSemana, EstadoDia, ResumenSemanal } from '../domain/cumplimiento';
import { calcularConstancia, lunesDeSemana } from '../domain/cumplimiento';
import { fechaLarga, sumarDias } from '../domain/fechas';
import type { Medicion, Mejor } from '../domain/mediciones';
import { conObjetivo, medicionesDeCampos, metaDeFicha, testsEnSegundos, wodsConResultado } from '../domain/mediciones';
import { calcularResumen } from '../domain/metricas';

interface Props {
  dias: Dia[];
  registros: Record<string, RegistroDia>;
  ficha: DatosFicha | null;
  hoy: string;
}

// ---------- Formatos ----------
const aFecha = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};
const fechaCorta = (iso: string) => aFecha(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
const decimal = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const entero = (n: number) => Math.round(n).toLocaleString('es-CL');

// 390 → «6:30»; 3735 → «1:02:15»; 45 → «45 s»
function tiempo(seg: number): string {
  const s = Math.round(Math.abs(seg));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

function valorMedicion(m: Medicion, v: number): string {
  if (m.formato === 'tiempo') return m.unidad ? `${tiempo(v)} ${m.unidad}` : tiempo(v);
  if (m.unidad === 'pasos' || m.unidad === 'min' || m.unidad === 'lpm') return `${entero(v)} ${m.unidad}`;
  return `${decimal(v)} ${m.unidad}`;
}

function deltaMedicion(m: Medicion, d: number): string {
  const signo = d > 0 ? '+' : '−';
  if (m.formato === 'tiempo') return `${signo}${tiempo(d)}`;
  return `${signo}${m.unidad === 'pasos' ? entero(Math.abs(d)) : decimal(Math.abs(d))} ${m.unidad}`;
}

// ¿El cambio va hacia donde es progreso?
const mejora = (mejor: Mejor, d: number) => (mejor === 'sube' && d > 0) || (mejor === 'baja' && d < 0);

// ---------- Piezas ----------

// Tendencia: línea gris y el último punto destacado
function Tendencia({ valores }: { valores: number[] }) {
  if (valores.length < 2) return <span className="prog-tendencia" aria-hidden="true" />;
  const W = 96;
  const H = 32;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const x = (i: number) => 4 + (i * (W - 8)) / (valores.length - 1);
  const y = (v: number) => (max === min ? H / 2 : H - 5 - ((v - min) * (H - 10)) / (max - min));
  const ultimo = valores.length - 1;
  return (
    <svg className="prog-tendencia" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        stroke="#a3a3a0"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(ultimo)} cy={y(valores[ultimo])} r="4" fill="var(--verde)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function FilaProgreso(props: {
  nombre: string;
  detalle: string;
  valores: number[];
  valor: string;
  cambio?: string;
  bien?: boolean;
}) {
  return (
    <div className="prog-fila">
      <div className="prog-fila-texto">
        <strong>{props.nombre}</strong>
        <span className="tenue">{props.detalle}</span>
      </div>
      <Tendencia valores={props.valores} />
      <div className="prog-fila-valor">
        <strong>{props.valor}</strong>
        {props.cambio && <span className={props.bien ? 'sube' : 'tenue'}>{props.cambio}</span>}
      </div>
    </div>
  );
}

const ICONO: Record<EstadoDia, string> = {
  cumplido: '✓',
  'sin-registro': '✕',
  pendiente: '',
  opcional: '',
  extra: '+',
  descanso: '',
};

const TEXTO_ESTADO: Record<EstadoDia, string> = {
  cumplido: 'cumplido',
  'sin-registro': 'sin registrar',
  pendiente: 'por hacer',
  opcional: 'opcional',
  extra: 'entrenamiento extra',
  descanso: 'descanso',
};

function TiraSemana({ dias }: { dias: DiaSemana[] }) {
  return (
    <ol className="prog-tira" aria-label="Días de la semana">
      {dias.map((d) => {
        const texto = `${d.nombre} ${d.numero}${d.titulo ? ` · ${d.titulo}` : ''}: ${TEXTO_ESTADO[d.estado]}${
          d.conExtra ? ' y entrenamiento extra' : ''
        }${d.hoy ? ' (hoy)' : ''}`;
        return (
          <li key={d.fecha} className={`prog-dia ${d.estado} ${d.hoy ? 'hoy' : ''}`} title={texto} aria-label={texto}>
            <span className="prog-dia-letra">{d.letra}</span>
            <span className="prog-dia-marca" aria-hidden="true">
              {ICONO[d.estado]}
              {d.conExtra && <span className="prog-dia-extra">+</span>}
            </span>
            <span className="prog-dia-numero">{d.numero}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Solo los estados que aparecen en la semana (descanso no necesita explicación)
const EN_LEYENDA: { estado: EstadoDia; texto: string }[] = [
  { estado: 'cumplido', texto: 'Cumplido' },
  { estado: 'sin-registro', texto: 'Sin registrar' },
  { estado: 'pendiente', texto: 'Por hacer' },
  { estado: 'opcional', texto: 'Opcional' },
  { estado: 'extra', texto: 'Extra' },
];

function Leyenda({ dias }: { dias: DiaSemana[] }) {
  const hay = (e: EstadoDia) => dias.some((d) => d.estado === e || (e === 'extra' && d.conExtra));
  return (
    <ul className="prog-leyenda" aria-hidden="true">
      {EN_LEYENDA.filter((l) => hay(l.estado)).map((l) => (
        <li key={l.estado} className={l.estado}>
          <span>{ICONO[l.estado]}</span>
          {l.texto}
        </li>
      ))}
    </ul>
  );
}

function estadoSemana(s: ResumenSemanal): { texto: string; clase: string } {
  if (!s.total) return { texto: 'Esta semana no tienes entrenamientos exigidos.', clase: '' };
  if (s.cumplidos === s.total) return { texto: '¡Semana cumplida!', clase: 'bien' };
  if (s.sinRegistro)
    return {
      texto: `${s.sinRegistro} sin registrar. Si entrenaste, anótalo en tu plan.`,
      clase: 'atencion',
    };
  return {
    texto: `Vas al día · ${s.pendientes === 1 ? 'te queda 1 entrenamiento' : `te quedan ${s.pendientes} entrenamientos`}`,
    clase: 'bien',
  };
}

const nombreSemana = (s: ResumenSemanal, actual: string, variosBloques: boolean) =>
  s.lunes === actual
    ? 'Esta semana'
    : s.semana
      ? `${variosBloques && s.bloque ? `B${s.bloque} · ` : ''}Semana ${s.semana}`
      : `Semana del ${fechaCorta(s.lunes)}`;

// ---------- Pantalla ----------

function MiProgreso({ dias, registros, ficha, hoy }: Props): React.JSX.Element {
  const constancia = useMemo(() => calcularConstancia(dias, registros, hoy), [dias, registros, hoy]);
  const resumen = useMemo(() => calcularResumen(dias, registros, hoy), [dias, registros, hoy]);
  const meta = useMemo(() => metaDeFicha(ficha, hoy), [ficha, hoy]);
  const mediciones = useMemo(
    () => [...conObjetivo(medicionesDeCampos(registros, hoy), meta), ...testsEnSegundos(dias, registros, hoy)],
    [dias, registros, hoy, meta],
  );
  const wods = useMemo(() => wodsConResultado(dias, registros, hoy).slice(0, 5), [dias, registros, hoy]);

  const lunesHoy = lunesDeSemana(hoy);
  const actual = constancia.actual;
  const diaHoy = dias.find((d) => d.fecha === hoy) ?? dias.find((d) => lunesDeSemana(d.fecha) === lunesHoy);
  const inicio = dias.length ? dias.reduce((a, d) => (d.fecha < a ? d.fecha : a), dias[0].fecha) : null;

  // Kilos levantados (kg × reps) por semana: se muestran igual que una medición semanal
  const kilos: Medicion = {
    nombre: 'Kilos levantados',
    unidad: 'kg',
    formato: 'numero',
    porSemana: true,
    mejor: 'sube',
    puntos: resumen.semanas
      .filter((s) => !s.futura && s.tonelaje > 0)
      .map((s) => ({ fecha: s.lunes, valor: s.tonelaje })),
  };
  const cargas = resumen.ejercicios.slice(0, 6);
  const hayProgreso = kilos.puntos.length > 0 || cargas.length > 0 || mediciones.length > 0 || wods.length > 0;
  const variosBloques = new Set(constancia.semanas.map((s) => s.bloque)).size > 1;
  const recientes = [...constancia.semanas].reverse().slice(0, 6);

  // Una medición en una fila: por semana (la de esta semana va aparte de la tendencia, porque está en curso)
  // o por registro (último valor y cuánto cambió desde el primero)
  function fila(m: Medicion, ayuda?: string) {
    const ps = m.puntos;
    const ultimo = ps[ps.length - 1];
    if (!m.porSemana) {
      const delta = ultimo.valor - ps[0].valor;
      return (
        <FilaProgreso
          key={`${m.nombre}-${m.unidad}`}
          nombre={m.nombre}
          detalle={
            ps.length > 1
              ? `${ps.length} registros · desde ${valorMedicion(m, ps[0].valor)}`
              : `Anotado el ${fechaCorta(ultimo.fecha)}`
          }
          valores={ps.slice(-12).map((p) => p.valor)}
          valor={valorMedicion(m, ultimo.valor)}
          cambio={ps.length > 1 && delta !== 0 ? deltaMedicion(m, delta) : undefined}
          bien={mejora(m.mejor, delta)}
        />
      );
    }
    const completas = ps.filter((p) => p.fecha < lunesHoy);
    const previa = completas[completas.length - 1];
    const estaSemana = ps.find((p) => p.fecha === lunesHoy);
    const cuando = (p: { fecha: string }) =>
      p.fecha === sumarDias(lunesHoy, -7) ? 'semana pasada' : `semana del ${fechaCorta(p.fecha)}`;
    const base = ayuda ?? (m.unidad === 'pasos' ? 'Promedio por semana' : 'Total por semana');
    return (
      <FilaProgreso
        key={`${m.nombre}-${m.unidad}`}
        nombre={m.nombre}
        detalle={estaSemana && previa ? `${mayuscula(cuando(previa))}: ${valorMedicion(m, previa.valor)}` : base}
        valores={completas.slice(-8).map((p) => p.valor)}
        valor={valorMedicion(m, (estaSemana ?? previa).valor)}
        cambio={estaSemana ? 'esta semana' : cuando(previa)}
      />
    );
  }

  const tarjetaMeta = (meta.evento || meta.objetivos.length > 0) && (
    <section className="tarjeta prog-objetivo" aria-label="Tu meta">
      {meta.evento && (
        <>
          <p className="prog-etiqueta">Tu evento</p>
          <p className="prog-evento">
            <strong>{meta.evento.nombre}</strong>
            <span>
              {meta.evento.faltan === 0
                ? '¡Es hoy!'
                : `Faltan ${meta.evento.faltan} ${meta.evento.faltan === 1 ? 'día' : 'días'}`}{' '}
              · {fechaLarga(meta.evento.fecha)}
            </span>
            {meta.evento.meta && <span className="tenue">Tu meta: {meta.evento.meta}</span>}
          </p>
        </>
      )}
      {meta.objetivos.length > 0 && (
        <>
          <p className="prog-etiqueta">{meta.evento ? 'Además quieres' : 'Lo que quieres lograr'}</p>
          <ul className="prog-chips">
            {meta.objetivos.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );

  return (
    <>
      <header className="plan-cabecera">
        <h1>Mi progreso</h1>
      </header>
      {diaHoy && (
        <p className="dia-meta prog-meta">
          Bloque {diaHoy.bloque} · Semana {diaHoy.semana}
          {diaHoy.fase ? ` · ${diaHoy.fase}` : ''}
        </p>
      )}

      {/* Esta semana: el número principal de la pantalla */}
      <section className="tarjeta prog-semana" aria-label="Esta semana">
        <p className="prog-etiqueta">
          Esta semana · {fechaCorta(lunesHoy)} al {fechaCorta(sumarDias(lunesHoy, 6))}
        </p>
        {actual ? (
          <>
            {actual.total > 0 && (
              <>
                <p className="prog-heroe">
                  <span className="prog-heroe-valor">{actual.porcentaje}%</span>
                  <span className="prog-heroe-texto">
                    {actual.cumplidos} de {actual.total} entrenamientos
                    {actual.extras > 0 ? ` · +${actual.extras} extra` : ''}
                  </span>
                </p>
                <div
                  className="prog-medidor"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={actual.total}
                  aria-valuenow={actual.cumplidos}
                  aria-label={`${actual.cumplidos} de ${actual.total} entrenamientos de la semana`}
                >
                  <span style={{ width: `${actual.porcentaje ?? 0}%` }} />
                </div>
              </>
            )}
            <p className={`prog-estado ${estadoSemana(actual).clase}`}>{estadoSemana(actual).texto}</p>
            <TiraSemana dias={actual.dias} />
            <Leyenda dias={actual.dias} />
          </>
        ) : (
          <p className="tenue">
            {inicio && inicio > hoy
              ? `Tu plan parte el ${fechaLarga(inicio)}. Ese día empieza a contar tu cumplimiento.`
              : 'Esta semana no tienes plan cargado. Cuando tu coach suba el próximo, aquí verás tu semana.'}
          </p>
        )}
      </section>

      {constancia.semanas.length > 0 && (
        <>
          <div className="prog-datos">
            <div className="prog-dato">
              <span className="prog-dato-etiqueta">Cumplimiento total</span>
              <span className="prog-dato-valor">
                {constancia.porcentaje === null ? '–' : `${constancia.porcentaje}%`}
              </span>
              <span className="prog-dato-detalle">
                {constancia.vencidos
                  ? `${constancia.cumplidos} de ${constancia.vencidos} desde el inicio`
                  : 'todavía sin entrenos vencidos'}
              </span>
            </div>
            <div className="prog-dato">
              <span className="prog-dato-etiqueta">Racha</span>
              <span className="prog-dato-valor">{constancia.racha}</span>
              <span className="prog-dato-detalle">
                {constancia.racha === 1 ? 'entreno cumplido seguido' : 'entrenos cumplidos seguidos'}
              </span>
            </div>
            <div className="prog-dato">
              <span className="prog-dato-etiqueta">Extras</span>
              <span className="prog-dato-valor">{constancia.extras}</span>
              <span className="prog-dato-detalle">entrenamientos fuera del plan</span>
            </div>
            <div className="prog-dato">
              <span className="prog-dato-etiqueta">Esfuerzo promedio</span>
              <span className="prog-dato-valor">{resumen.rpe === null ? '–' : decimal(resumen.rpe)}</span>
              <span className="prog-dato-detalle">RPE de las últimas 2 semanas</span>
            </div>
          </div>

          <h2 className="subtitulo">Semana a semana</h2>
          <section className="tarjeta prog-semanas" aria-label="Cumplimiento semana a semana">
            {recientes.map((s) => (
              <div key={s.lunes} className={`prog-semana-fila ${s.lunes === lunesHoy ? 'actual' : ''}`}>
                <span className="prog-semana-nombre">
                  <strong>{nombreSemana(s, lunesHoy, variosBloques)}</strong>
                  <span className="tenue">del {fechaCorta(s.lunes)}</span>
                </span>
                <span className="prog-medidor delgado" aria-hidden="true">
                  <span style={{ width: `${s.porcentaje ?? 0}%` }} />
                </span>
                <span className="prog-semana-cifra">
                  {s.total ? (
                    <>
                      <strong>{s.porcentaje}%</strong>
                      <span className="tenue">
                        {s.cumplidos} de {s.total}
                      </span>
                    </>
                  ) : (
                    <span className="tenue">sin entrenos</span>
                  )}
                </span>
              </div>
            ))}
          </section>
        </>
      )}

      <h2 className="subtitulo">Tu progreso</h2>
      {tarjetaMeta}
      {!hayProgreso && (
        <p className="tarjeta tenue prog-vacio">
          Aquí vas a ver cómo avanzas: los kilos de tus series, tus tests, tus WODs y lo que anotas al terminar
          (distancia, ritmo, peso…). Anota lo que haces en cada sesión y esta sección se va llenando.
        </p>
      )}

      {kilos.puntos.length > 0 && (
        <section className="tarjeta" aria-label="Kilos levantados">
          {fila(kilos, 'Suma de kg × reps de tus series')}
        </section>
      )}

      {cargas.length > 0 && (
        <>
          <h3 className="prog-titulo">Tus cargas</h3>
          <section className="tarjeta" aria-label="Tus cargas">
            {cargas.map((e) => {
              const delta = e.mejor - e.inicial;
              return (
                <FilaProgreso
                  key={e.nombre}
                  nombre={e.nombre}
                  detalle={`${e.puntos.length} ${e.puntos.length === 1 ? 'registro' : 'registros'} · empezaste con ${decimal(e.inicial)} kg`}
                  valores={e.puntos.map((p) => p.kg)}
                  valor={`${decimal(e.mejor)} kg`}
                  cambio={delta > 0 ? `+${decimal(delta)} kg` : 'tu mejor peso'}
                  bien={delta > 0}
                />
              );
            })}
          </section>
        </>
      )}

      {mediciones.length > 0 && (
        <>
          <h3 className="prog-titulo">Tus mediciones</h3>
          <section className="tarjeta" aria-label="Tus mediciones">
            {mediciones.map((m) => fila(m))}
          </section>
        </>
      )}

      {wods.length > 0 && (
        <>
          <h3 className="prog-titulo">Tus WODs</h3>
          <section className="tarjeta" aria-label="Tus WODs">
            {wods.map((w, i) => (
              <div key={`${w.fecha}-${i}`} className="prog-wod">
                <span className="prog-wod-fecha">{fechaCorta(w.fecha)}</span>
                <span className="prog-wod-titulo">{w.titulo}</span>
                {w.resultado && <span className="prog-wod-resultado">{w.resultado}</span>}
              </div>
            ))}
          </section>
        </>
      )}

      <p className="tenue dash-nota prog-nota">
        Un entrenamiento está cumplido cuando anotas algo en él. Los días «(opcional)» no bajan tu cumplimiento: si los
        haces, suman como extra.
      </p>
    </>
  );
}

export default MiProgreso;
