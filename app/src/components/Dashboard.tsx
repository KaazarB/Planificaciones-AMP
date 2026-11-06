// Capa de componentes: dashboard de entrenamientos para el coach
// Resumen de todos los atletas activos y, al tocar uno, su detalle por semana.

import { useEffect, useMemo, useState } from 'react';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { hoyISO } from '../domain/fechas';
import type { Ejercicio, ResumenAtleta, SemanaMetrica } from '../domain/metricas';
import { calcularResumen, pct } from '../domain/metricas';
import type { Perfil } from '../services/cuenta';
import { mensajeError } from '../services/cuenta';
import { diasDeTodos } from '../services/plan';
import { registrosDeTodos } from '../services/registros';

interface Fila {
  atleta: Perfil;
  resumen: ResumenAtleta;
}

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

const hace = (dias: number | null) =>
  dias === null ? 'Sin registros' : dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${dias} días`;

const miles = (n: number) => Math.round(n).toLocaleString('es-CL');
const decimal = (n: number | null) => (n === null ? '–' : n.toLocaleString('es-CL', { maximumFractionDigits: 1 }));

// Semáforo de cumplimiento: siempre con texto, nunca solo color
function nivel(p: number | null): { clase: string; texto: string } {
  if (p === null) return { clase: 'nivel-nada', texto: 'Sin datos' };
  if (p >= 80) return { clase: 'nivel-bien', texto: 'Al día' };
  if (p >= 50) return { clase: 'nivel-medio', texto: 'Irregular' };
  return { clase: 'nivel-bajo', texto: 'Bajo' };
}

function Dato({ valor, etiqueta, detalle }: { valor: string; etiqueta: string; detalle?: string }) {
  return (
    <div className="dash-dato">
      <span className="dash-dato-valor">{valor}</span>
      <span className="dash-dato-etiqueta">{etiqueta}</span>
      {detalle && <span className="dash-dato-detalle">{detalle}</span>}
    </div>
  );
}

// Barras de cumplimiento por semana (una serie: % de entrenamientos registrados)
function BarrasSemanas({ semanas, compacto = false }: { semanas: SemanaMetrica[]; compacto?: boolean }) {
  const [activa, setActiva] = useState<number | null>(null);
  if (!semanas.length) return null;
  return (
    <div className={`dash-barras ${compacto ? 'compacto' : ''}`} role="img" aria-label="Cumplimiento por semana">
      {semanas.map((s, i) => {
        const p = pct(s.hechos, s.planificados);
        const etiqueta = s.futura
          ? `Semana del ${fechaCorta(s.lunes)}: por venir (${s.totalSemana} entrenos)`
          : `Semana del ${fechaCorta(s.lunes)}: ${s.hechos} de ${s.planificados} entrenos (${p ?? 0}%)`;
        return (
          <div
            key={s.lunes}
            className="dash-barra-col"
            title={etiqueta}
            onMouseEnter={() => setActiva(i)}
            onMouseLeave={() => setActiva(null)}
            onClick={() => setActiva(activa === i ? null : i)}
          >
            {!compacto && <span className="dash-barra-valor">{s.futura ? '' : `${p ?? 0}%`}</span>}
            <div className="dash-barra-pista">
              <div
                className={`dash-barra ${s.futura ? 'futura' : ''}`}
                style={{ height: s.futura ? '100%' : `${Math.max(p ?? 0, 2)}%` }}
              />
            </div>
            {!compacto && <span className="dash-barra-eje">{s.semana ? `S${s.semana}` : fechaCorta(s.lunes)}</span>}
            {activa === i && !compacto && <span className="dash-tooltip">{etiqueta}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Línea de progreso de un ejercicio (mejor kg de cada día)
function Progreso({ ejercicio }: { ejercicio: Ejercicio }) {
  const ps = ejercicio.puntos;
  const W = 120;
  const H = 32;
  const min = Math.min(...ps.map((p) => p.kg));
  const max = Math.max(...ps.map((p) => p.kg));
  const x = (i: number) => (ps.length === 1 ? W / 2 : 4 + (i * (W - 8)) / (ps.length - 1));
  const y = (kg: number) => (max === min ? H / 2 : H - 4 - ((kg - min) * (H - 8)) / (max - min));
  const delta = ejercicio.mejor - ejercicio.inicial;
  return (
    <div className="dash-ejercicio" title={ps.map((p) => `${fechaCorta(p.fecha)}: ${decimal(p.kg)} kg`).join('\n')}>
      <div className="dash-ejercicio-nombre">
        <strong>{ejercicio.nombre}</strong>
        <span className="tenue">
          {ps.length} {ps.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {ps.length > 1 && (
          <polyline
            points={ps.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')}
            fill="none"
            stroke="var(--verde)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        <circle
          cx={x(ps.length - 1)}
          cy={y(ps[ps.length - 1].kg)}
          r="4"
          fill="var(--verde)"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>
      <div className="dash-ejercicio-kg">
        <strong>{decimal(ejercicio.mejor)} kg</strong>
        <span className={delta > 0 ? 'sube' : 'tenue'}>
          {delta > 0 ? `+${decimal(delta)} kg` : `desde ${decimal(ejercicio.inicial)}`}
        </span>
      </div>
    </div>
  );
}

function DetalleDashboard({ fila, onVolver }: { fila: Fila; onVolver: () => void }) {
  const { atleta, resumen: r } = fila;
  const nombre = atleta.apodo || atleta.nombre.split(' ')[0];
  const pasadas = r.semanas.filter((s) => !s.futura);
  return (
    <>
      <button className="enlace volver" onClick={onVolver}>
        ‹ Dashboard
      </button>
      <h2 className="dia-titulo">{atleta.nombre || 'Sin nombre'}</h2>
      <div className="dia-meta">
        {r.actual?.bloque && (
          <span>
            Bloque {r.actual.bloque} · Semana {r.actual.semana}
            {r.actual.fase ? ` · ${r.actual.fase}` : ''}
          </span>
        )}
        <span>Último registro: {hace(r.diasSinRegistro).toLowerCase()}</span>
      </div>

      {r.alertas.map((a, i) => (
        <p key={i} className={`dash-alerta ${a.gravedad}`}>
          <span aria-hidden="true">{a.gravedad === 'critica' ? '⚠' : '●'}</span> {a.texto}
        </p>
      ))}

      <div className="dash-datos">
        <Dato
          valor={r.actual ? `${r.actual.hechos}/${r.actual.planificados}` : '–'}
          etiqueta="Esta semana"
          detalle={r.actual ? `de ${r.actual.totalSemana} entrenos` : undefined}
        />
        <Dato
          valor={r.adherencia4 === null ? '–' : `${r.adherencia4}%`}
          etiqueta="Cumplimiento"
          detalle="últimas 4 sem."
        />
        <Dato valor={decimal(r.rpe)} etiqueta="RPE promedio" detalle="últimas 2 sem." />
        <Dato valor={r.adherencia === null ? '–' : `${r.adherencia}%`} etiqueta="Total" detalle="desde el inicio" />
      </div>

      <h3 className="subtitulo">Entrenamientos registrados por semana</h3>
      <div className="tarjeta">
        {r.semanas.length ? (
          <BarrasSemanas semanas={r.semanas} />
        ) : (
          <p className="tenue">Todavía no tiene planes cargados.</p>
        )}
      </div>

      {pasadas.length > 0 && (
        <>
          <h3 className="subtitulo">Detalle por semana</h3>
          <div className="tarjeta dash-tabla-envoltura">
            <table className="dash-tabla">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Entrenos</th>
                  <th>Series</th>
                  <th>Tonelaje</th>
                  <th>RPE</th>
                  <th>Lumbar</th>
                </tr>
              </thead>
              <tbody>
                {[...pasadas].reverse().map((s) => (
                  <tr key={s.lunes}>
                    <td>
                      {s.semana ? `S${s.semana} · ` : ''}
                      {fechaCorta(s.lunes)}
                    </td>
                    <td>
                      {s.hechos}/{s.planificados}
                    </td>
                    <td>{s.seriesPlan ? `${pct(s.seriesHechas, s.seriesPlan)}%` : '–'}</td>
                    <td>{s.tonelaje ? `${miles(s.tonelaje)} kg` : '–'}</td>
                    <td>{decimal(s.rpe)}</td>
                    <td className={s.lumbar !== null && s.lumbar >= 6 ? 'dash-celda-alerta' : ''}>
                      {s.lumbar === null ? '–' : `${s.lumbar}/10`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tenue dash-nota">
            Series: % de series con datos anotados. Tonelaje: suma de kg × reps. Lumbar: máximo «después» de la semana.
          </p>
        </>
      )}

      <h3 className="subtitulo">Progreso de cargas</h3>
      <div className="tarjeta">
        {r.ejercicios.length ? (
          r.ejercicios.slice(0, 8).map((e) => <Progreso key={e.nombre} ejercicio={e} />)
        ) : (
          <p className="tenue">Cuando {nombre} anote kilos en sus series, aquí aparece cómo van subiendo.</p>
        )}
      </div>
    </>
  );
}

function Dashboard({ atletas, onVolver }: { atletas: Perfil[]; onVolver: () => void }): React.JSX.Element {
  const [dias, setDias] = useState<Map<string, Dia[]> | null>(null);
  const [registros, setRegistros] = useState<Map<string, Record<string, RegistroDia>>>(new Map());
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([diasDeTodos(), registrosDeTodos()])
      .then(([d, r]) => {
        if (!vigente) return;
        setDias(d);
        setRegistros(r);
      })
      .catch((e) => vigente && setError(mensajeError(e)));
    return () => {
      vigente = false;
    };
  }, []);

  const hoy = hoyISO();
  const filas: Fila[] = useMemo(() => {
    if (!dias) return [];
    return atletas
      .filter((a) => a.estado === 'activo' && dias.has(a.id))
      .map((a) => ({ atleta: a, resumen: calcularResumen(dias.get(a.id) ?? [], registros.get(a.id) ?? {}, hoy) }))
      .sort(
        (a, b) =>
          b.resumen.alertas.length - a.resumen.alertas.length ||
          (a.resumen.adherencia4 ?? 101) - (b.resumen.adherencia4 ?? 101),
      );
  }, [atletas, dias, registros, hoy]);

  const elegida = filas.find((f) => f.atleta.id === elegido);
  if (elegida) return <DetalleDashboard fila={elegida} onVolver={() => setElegido(null)} />;

  const hechos = filas.reduce((n, f) => n + (f.resumen.actual?.hechos ?? 0), 0);
  const planificados = filas.reduce((n, f) => n + (f.resumen.actual?.planificados ?? 0), 0);
  const registros7 = filas.reduce((n, f) => n + f.resumen.registrosSemana, 0);
  const conAlertas = filas.filter((f) => f.resumen.alertas.length);
  const sinPlan = atletas.filter((a) => a.estado === 'activo' && dias && !dias.has(a.id));

  return (
    <>
      <button className="enlace volver" onClick={onVolver}>
        ‹ Coach
      </button>
      <header className="plan-cabecera">
        <h1>Dashboard</h1>
      </header>
      {error && <p className="aviso-error">{error}</p>}
      {!dias && !error && <p className="cargando">Cargando entrenamientos…</p>}

      {dias && (
        <>
          <div className="dash-datos">
            <Dato valor={String(filas.length)} etiqueta="Atletas con plan" />
            <Dato
              valor={planificados ? `${pct(hechos, planificados)}%` : '–'}
              etiqueta="Cumplimiento"
              detalle={planificados ? `${hechos} de ${planificados} esta semana` : 'esta semana'}
            />
            <Dato valor={String(registros7)} etiqueta="Días registrados" detalle="últimos 7 días" />
            <Dato valor={String(conAlertas.length)} etiqueta="Con alertas" />
          </div>

          {conAlertas.length > 0 && (
            <>
              <h3 className="subtitulo">Para revisar</h3>
              {conAlertas.map((f) =>
                f.resumen.alertas.map((a, i) => (
                  <button
                    key={`${f.atleta.id}-${i}`}
                    className={`dash-alerta ${a.gravedad} como-boton`}
                    onClick={() => setElegido(f.atleta.id)}
                  >
                    <span aria-hidden="true">{a.gravedad === 'critica' ? '⚠' : '●'}</span>{' '}
                    <strong>{f.atleta.apodo || f.atleta.nombre.split(' ')[0]}:</strong> {a.texto} ›
                  </button>
                )),
              )}
            </>
          )}

          <h3 className="subtitulo">Atletas · últimas semanas</h3>
          {filas.length === 0 && <p className="tenue">Ningún atleta activo tiene plan cargado todavía.</p>}
          {filas.map(({ atleta, resumen: r }) => {
            const nv = nivel(r.adherencia4);
            const recientes = r.semanas.filter((s) => s.lunes <= hoy).slice(-6);
            return (
              <button key={atleta.id} className="fila-atleta dash-fila" onClick={() => setElegido(atleta.id)}>
                <span className="dash-fila-texto">
                  <strong>{atleta.nombre || 'Sin nombre'}</strong>
                  <span className="tenue">
                    {r.actual ? `${r.actual.hechos}/${r.actual.planificados} esta semana · ` : ''}
                    {hace(r.diasSinRegistro)}
                    {r.rpe !== null ? ` · RPE ${decimal(r.rpe)}` : ''}
                  </span>
                </span>
                <BarrasSemanas semanas={recientes} compacto />
                <span className={`dash-nivel ${nv.clase}`}>
                  {r.adherencia4 !== null && <strong>{r.adherencia4}%</strong>}
                  <span>{nv.texto}</span>
                </span>
              </button>
            );
          })}

          {sinPlan.length > 0 && (
            <p className="tenue dash-nota">
              Activos sin plan cargado: {sinPlan.map((a) => a.apodo || a.nombre.split(' ')[0]).join(', ')}.
            </p>
          )}
          <p className="tenue dash-nota">
            Cumplimiento = entrenamientos (sesiones, clases y carreras) ya vencidos que tienen algo anotado.
          </p>
        </>
      )}
    </>
  );
}

export default Dashboard;
