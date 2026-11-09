// Capa de pantallas: panel del coach (atletas, fichas y carga de planes)

import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';

import BibliotecaVideos from '../components/BibliotecaVideos';
import Dashboard from '../components/Dashboard';
import FichaResumen from '../components/FichaResumen';
import GuiaMensual from '../components/GuiaMensual';
import Invitaciones from '../components/Invitaciones';
import PlanVista from '../components/PlanVista';
import RecordarCorreo from '../components/RecordarCorreo';
import { useCuenta } from '../context/Cuenta';
import type { CampoFicha, DatosFicha } from '../data/ficha';
import type { Plan } from '../data/plan';
import { camposRevision } from '../data/revision';
import { guiaPendiente } from '../domain/correo';
import {
  diasEntre,
  esFechaISO,
  fechaDeMarca,
  fechaLarga,
  haceDias,
  hoyISO,
  lunesDeISO,
  semanasEntre,
} from '../domain/fechas';
import type { UltimoBloque } from '../domain/renovacion';
import { alertaDe, alertasRenovacion, textoAlerta } from '../domain/renovacion';
import { destinoWhatsapp, enlaceApp, enlaceWhatsapp, numeroWhatsapp } from '../domain/whatsapp';
import { ultimosEnvios } from '../services/correos';
import type { Estado, FichaBreve, Perfil } from '../services/cuenta';
import { fichasBreves, leerFicha, marcarFichaRevisada, mensajeError } from '../services/cuenta';
import type { FilaPlan } from '../services/plan';
import { borrarPlan, planesDe, subirPlan, ultimosBloques, validarPlan } from '../services/plan';
import type { Revision } from '../services/revisiones';
import { revisionesRespondidas, ultimaRevision } from '../services/revisiones';
import { supabase } from '../services/supabase';

const mensajeRevision = (apodo: string, bloque: number, fin: string) =>
  `¡Hola ${apodo}! 💪 Tu Bloque ${bloque} termina el ${fechaLarga(fin)}.\n\n` +
  `Antes de armar el siguiente, responde la revisión que aparece arriba en tu plan (es 1 minuto): ${enlaceApp()}\n\n` +
  '¡Gracias!';

// Respuestas de la revisión de fin de bloque, para el coach
function RevisionResumen({ revision }: { revision: Revision }) {
  const texto = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '');
  const filas = camposRevision.map((c: CampoFicha) => ({ c, v: texto(revision.datos[c.clave]) })).filter((f) => f.v);
  const molestiaFuerte = revision.datos.molestia_nivel === 'Fuerte (7-10)';
  return (
    <div className="ficha-resumen">
      <section className={molestiaFuerte ? 'revision-alerta' : ''}>
        <h3>
          Revisión del Bloque {revision.bloque} · {new Date(revision.creado).toLocaleDateString('es-CL')}
        </h3>
        <dl>
          {filas.map(({ c, v }) => (
            <div key={c.clave}>
              <dt>{c.etiqueta}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

const mensajeFicha = (apodo: string) =>
  `¡Hola ${apodo}! 👋 Vi que creaste tu cuenta en la app, pero todavía falta tu ficha.\n\n` +
  `Entra desde el ícono o aquí: ${enlaceApp()}\n\n` +
  'Son unos 10 minutos y con eso armo tu planificación 💪';

// Aviso para quien ya envió su ficha y está esperando su plan (sirve por correo y por WhatsApp)
const asuntoEspera = 'Recibí tu ficha: tu planificación está en camino';
const mensajeEspera = (apodo: string) =>
  `¡Hola ${apodo}! 👋 Recibí tu ficha, ¡gracias por completarla!\n\n` +
  'Ya estoy trabajando en tu planificación. Antes de cargarla la revisamos juntos y, cuando esté lista, ' +
  `la verás directo en la app: ${enlaceApp()}\n\n` +
  'Si quieres cambiar algo, puedes editar tu ficha desde la app.\n\n' +
  '¡Vamos con todo! 💪';

const textoEstado: Record<Estado, string> = {
  ficha: 'Ficha pendiente',
  evaluacion: 'En evaluación',
  activo: 'Activo',
  pausa: 'En pausa',
};
// Lee el archivo como texto; usa FileReader si el navegador no soporta file.text()
function leerTexto(archivo: File): Promise<string> {
  if (typeof archivo.text === 'function') return archivo.text();
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(lector.error ?? new Error('No se pudo leer el archivo.'));
    lector.readAsText(archivo);
  });
}

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  const dia = f.toLocaleDateString('es-CL', { weekday: 'long' });
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });
  return `${dia} ${d} de ${mes}`;
};

// «Ficha pendiente» y «Esperando su plan» van en sus propias secciones, con su aviso por correo o WhatsApp
const ordenEstado: Estado[] = ['activo', 'pausa'];

// Quien envió su ficha y espera su plan: aviso por Gmail (con copiar) y, si tiene número, por WhatsApp
// Atleta con plan que cambió su ficha: hay que revisar si su planificación necesita ajustes
function TarjetaFichaModificada({
  atleta,
  onAbrir,
  onRevisado,
}: {
  atleta: Perfil;
  onAbrir: () => void;
  onRevisado: () => void;
}) {
  const [error, setError] = useState('');
  const cuando = haceDias(diasEntre(fechaDeMarca(atleta.ficha_modificada ?? atleta.creado), hoyISO()));
  async function revisado() {
    setError('');
    try {
      await marcarFichaRevisada(atleta.id);
      onRevisado();
    } catch (e) {
      setError(mensajeError(e));
    }
  }
  return (
    <div className="tarjeta fila-pendiente ficha-modificada">
      <button className="enlace-fila" onClick={onAbrir}>
        <strong>{atleta.nombre || 'Sin nombre'}</strong>
        <span className="tenue">Modificó su ficha {cuando} · ya tiene plan: revisa si hay que ajustarlo</span>
      </button>
      <div className="fila-botones aviso-espera-whatsapp">
        <button className="boton" onClick={onAbrir}>
          Ver su ficha
        </button>
        <button className="boton secundario" onClick={revisado}>
          Plan revisado
        </button>
      </div>
      {error && <p className="aviso-error">{error}</p>}
    </div>
  );
}

function TarjetaEspera({ atleta, ficha, onAbrir }: { atleta: Perfil; ficha?: FichaBreve; onAbrir: () => void }) {
  const apodo = atleta.apodo || atleta.nombre.split(' ')[0];
  const numero = numeroWhatsapp(ficha?.whatsapp || atleta.whatsapp);
  const enviada = ficha
    ? `Envió su ficha ${haceDias(diasEntre(fechaDeMarca(ficha.actualizado), hoyISO()))}`
    : 'Ficha enviada';
  return (
    <div className="tarjeta fila-pendiente">
      <button className="enlace-fila" onClick={onAbrir}>
        <strong>{atleta.nombre || 'Sin nombre'}</strong>
        <span className="tenue">
          {enviada}
          {esFechaISO(ficha?.inicio) ? ` · quiere empezar el ${fechaLarga(ficha.inicio)}` : ''}
        </span>
      </button>
      {atleta.correo && (
        <RecordarCorreo
          correo={atleta.correo}
          asunto={asuntoEspera}
          mensaje={mensajeEspera(apodo)}
          textoBoton="Informar por Gmail"
        />
      )}
      {numero && (
        <div className="fila-botones aviso-espera-whatsapp">
          <a
            className="boton whatsapp-boton"
            href={enlaceWhatsapp(numero, mensajeEspera(apodo))}
            target={destinoWhatsapp}
            rel="noreferrer"
          >
            Informar por WhatsApp
          </a>
        </div>
      )}
      {!atleta.correo && !numero && <p className="tenue">Sin WhatsApp ni correo guardado.</p>}
    </div>
  );
}

function DetalleAtleta({
  atleta,
  esYo,
  onVolver,
  ultimaGuia,
  onCambioGuia,
}: {
  atleta: Perfil;
  esYo: boolean;
  onVolver: () => void;
  ultimaGuia?: string;
  onCambioGuia: (atletaId: string, enviado: string | null) => void;
}) {
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [planes, setPlanes] = useState<FilaPlan[]>([]);
  const [estado, setEstado] = useState<Estado>(atleta.estado);
  const [modificada, setModificada] = useState(atleta.ficha_modificada ?? null);

  async function revisarFicha() {
    setError('');
    try {
      await marcarFichaRevisada(atleta.id);
      setModificada(null);
    } catch (e) {
      setError(mensajeError(e));
    }
  }
  const [mensaje, setMensaje] = useState('');
  const [trabajando, setTrabajando] = useState('');
  const [pendiente, setPendiente] = useState<{ plan: Plan; resumen: string } | null>(null);
  const [porQuitar, setPorQuitar] = useState<FilaPlan | null>(null);
  const [planCargado, setPlanCargado] = useState('');
  const [verPlan, setVerPlan] = useState(false);
  const [error, setError] = useState('');

  const recargarPlanes = useCallback(() => planesDe(atleta.id).then(setPlanes), [atleta.id]);

  useEffect(() => {
    leerFicha(atleta.id).then(setFicha);
    ultimaRevision(atleta.id)
      .then(setRevision)
      .catch(() => setRevision(null));
    recargarPlanes();
  }, [atleta.id, recargarPlanes]);

  async function cambiarEstado(nuevo: Estado) {
    setError('');
    const { error: e } = await supabase.rpc('coach_cambiar_estado', { p_atleta: atleta.id, p_estado: nuevo });
    if (e) return setError(mensajeError(e));
    setEstado(nuevo);
  }

  // Paso 1: leer y revisar el archivo (todavía no se sube)
  async function leerArchivo(archivo: File) {
    setError('');
    setMensaje('');
    setPendiente(null);
    setTrabajando(`Leyendo ${archivo.name}…`);
    try {
      const plan = validarPlan(JSON.parse(await leerTexto(archivo)));
      const resumen = `Bloque ${plan.bloque.numero} · ${plan.bloque.inicio} a ${plan.bloque.fin} · ${plan.dias.length} días`;
      setPendiente({ plan, resumen });
    } catch (e) {
      setError(
        e instanceof SyntaxError ? `«${archivo.name}» no es un plan válido (JSON con errores).` : mensajeError(e),
      );
    } finally {
      setTrabajando('');
    }
  }

  // Paso 2: el coach confirma y se sube
  async function confirmarCarga() {
    if (!pendiente) return;
    setError('');
    setTrabajando('Subiendo plan…');
    try {
      await subirPlan(atleta.id, pendiente.plan);
      if (estado !== 'activo') await cambiarEstado('activo');
      if (modificada) await revisarFicha();
      await recargarPlanes();
      setMensaje(`Plan cargado: ${pendiente.resumen}. ${atleta.nombre.split(' ')[0]} ya lo ve en su app.`);
      setPlanCargado(`bloque ${pendiente.plan.bloque.numero}, desde el ${fechaCorta(pendiente.plan.bloque.inicio)}`);
      setPendiente(null);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando('');
    }
  }

  async function quitarPlan(p: FilaPlan) {
    setError('');
    try {
      await borrarPlan(p.id);
      setPorQuitar(null);
      await recargarPlanes();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  const whatsapp = numeroWhatsapp(ficha?.whatsapp ?? atleta.whatsapp);
  const primerNombre = atleta.apodo || atleta.nombre.split(' ')[0];

  const avisoPlan =
    `¡Hola ${primerNombre}! 💪 Ya está cargada tu planificación en la app (${planCargado}).\n\n` +
    `Ábrela desde el ícono o en este link: ${enlaceApp()}\n\n` +
    'Revisa tu primera sesión y cualquier duda me escribes. ¡Vamos con todo!';

  if (verPlan) {
    return (
      <>
        <button className="enlace volver" onClick={() => setVerPlan(false)}>
          ‹ Ficha de {primerNombre}
        </button>
        <p className="vista-coach">Vista de coach: ves su plan y lo que ha registrado, sin poder modificarlo.</p>
        <PlanVista atleta={atleta.id} apodo={primerNombre} soloLectura />
      </>
    );
  }

  return (
    <>
      <button className="enlace volver" onClick={onVolver}>
        ‹ Atletas
      </button>
      <h2 className="dia-titulo">{atleta.nombre || 'Sin nombre'}</h2>
      <div className="dia-meta">
        <span className={`etiqueta estado-${estado}`}>{textoEstado[estado]}</span>
        {esYo && <span>Tu cuenta</span>}
        <span>Desde {new Date(atleta.creado).toLocaleDateString('es-CL')}</span>
      </div>
      {modificada && (
        <div className="aviso aviso-ficha-modificada">
          <p>
            <strong>Modificó su ficha</strong> el {fechaLarga(fechaDeMarca(modificada))}. Revisa abajo los cambios y si
            su plan necesita ajustes; si cargas un plan nuevo, este aviso se quita solo.
          </p>
          <button className="boton secundario" onClick={revisarFicha}>
            Plan revisado
          </button>
        </div>
      )}
      {esFechaISO(ficha?.inicio) && (
        <p className="aviso inicio-atleta">
          Quiere empezar el {fechaLarga(ficha.inicio)}. Su plan debería partir el{' '}
          <strong>{fechaLarga(lunesDeISO(ficha.inicio))}</strong>.
        </p>
      )}
      {ficha?.tiene_evento === 'Sí' && esFechaISO(ficha.fecha_evento) && (
        <p className="aviso evento-atleta">
          <strong>Evento:</strong> {String(ficha.evento ?? '')} el {fechaLarga(ficha.fecha_evento)}
          {ficha.meta_evento ? ` · ${String(ficha.meta_evento)}` : ''}
          {ficha.marca_evento ? ` (${String(ficha.marca_evento)})` : ''}. Hay{' '}
          <strong>
            {semanasEntre(esFechaISO(ficha.inicio) ? lunesDeISO(ficha.inicio) : hoyISO(), ficha.fecha_evento)} semanas
          </strong>{' '}
          desde el inicio de su plan.
        </p>
      )}

      {estado === 'ficha' && !whatsapp && atleta.correo && (
        <RecordarCorreo
          correo={atleta.correo}
          asunto="Tu ficha de entrenamiento"
          mensaje={mensajeFicha(primerNombre)}
        />
      )}
      {estado === 'evaluacion' && atleta.correo && (
        <RecordarCorreo
          correo={atleta.correo}
          asunto={asuntoEspera}
          mensaje={mensajeEspera(primerNombre)}
          textoBoton="Informar por Gmail"
        />
      )}
      <div className="fila-botones">
        {estado === 'ficha' && whatsapp && (
          <a
            className="boton whatsapp-boton"
            href={enlaceWhatsapp(whatsapp, mensajeFicha(primerNombre))}
            target={destinoWhatsapp}
            rel="noreferrer"
          >
            Recordar ficha por WhatsApp
          </a>
        )}
        {estado === 'evaluacion' && whatsapp && (
          <a
            className="boton whatsapp-boton"
            href={enlaceWhatsapp(whatsapp, mensajeEspera(primerNombre))}
            target={destinoWhatsapp}
            rel="noreferrer"
          >
            Informar por WhatsApp
          </a>
        )}
        {planes.length > 0 && (
          <button className="boton" onClick={() => setVerPlan(true)}>
            Ver su planificación
          </button>
        )}
        {whatsapp && (
          <a className="boton secundario" href={enlaceWhatsapp(whatsapp)} target={destinoWhatsapp} rel="noreferrer">
            WhatsApp
          </a>
        )}
        {estado !== 'activo' && (
          <button className="boton secundario" onClick={() => cambiarEstado('activo')}>
            Marcar activo
          </button>
        )}
        {estado === 'activo' && (
          <button className="boton secundario" onClick={() => cambiarEstado('pausa')}>
            Pausar
          </button>
        )}
      </div>

      {estado === 'activo' && !esYo && atleta.correo && (
        <>
          <h3 className="subtitulo">Guía mensual por correo</h3>
          <GuiaMensual atleta={atleta} ultimo={ultimaGuia} onCambio={onCambioGuia} />
        </>
      )}

      <h3 className="subtitulo">Planes</h3>
      {(() => {
        if (estado !== 'activo' || !planes.length) return null;
        const ultimo = planes.reduce((a, b) => (b.fin > a.fin ? b : a));
        const al = alertaDe(atleta.id, { bloque: ultimo.bloque, fin: ultimo.fin }, hoyISO());
        if (!al) return null;
        const respondida = revision?.bloque === ultimo.bloque;
        return (
          <>
            <p className={`aviso aviso-renovar ${al.urgente ? 'urgente' : ''}`}>
              {textoAlerta(al, fechaLarga)}. Carga el <strong>Bloque {ultimo.bloque + 1}</strong> para que empiece el{' '}
              {fechaLarga(al.proximoInicio)}.{' '}
              {respondida ? '✓ Ya respondió su revisión (abajo).' : 'Todavía no responde su revisión.'}
            </p>
            {!respondida && whatsapp && (
              <a
                className="boton whatsapp-boton ancho recordar-revision"
                href={enlaceWhatsapp(whatsapp, mensajeRevision(primerNombre, ultimo.bloque, ultimo.fin))}
                target={destinoWhatsapp}
                rel="noreferrer"
              >
                Recordar revisión por WhatsApp
              </a>
            )}
          </>
        );
      })()}
      <div className="tarjeta">
        {planes.length === 0 && <p className="tenue">Aún no tiene planes cargados.</p>}
        {planes.map((p) => (
          <div key={p.id} className="fila-plan">
            <span>
              <strong>Bloque {p.bloque}</strong> · {p.inicio} → {p.fin}
            </span>
            {porQuitar?.id === p.id ? (
              <span className="confirmar-linea">
                <button className="enlace peligro" onClick={() => quitarPlan(p)}>
                  Sí, quitar
                </button>
                <button className="enlace" onClick={() => setPorQuitar(null)}>
                  No
                </button>
              </span>
            ) : (
              <button className="enlace peligro" onClick={() => setPorQuitar(p)}>
                Quitar
              </button>
            )}
          </div>
        ))}
        {pendiente ? (
          <div className="confirmar-plan">
            <p>
              ¿Cargar este plan a <strong>{atleta.nombre}</strong>?
            </p>
            <p className="tenue">{pendiente.resumen}</p>
            <div className="fila-botones">
              <button className="boton" onClick={confirmarCarga} disabled={Boolean(trabajando)}>
                {trabajando || 'Cargar plan'}
              </button>
              <button className="boton secundario" onClick={() => setPendiente(null)} disabled={Boolean(trabajando)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <label className="boton ancho subir">
            {trabajando || 'Elegir archivo del plan (.json)'}
            <input
              type="file"
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0];
                if (f) await leerArchivo(f);
                input.value = '';
              }}
            />
          </label>
        )}
        {mensaje && <p className="aviso">{mensaje}</p>}
        {planCargado &&
          (whatsapp ? (
            <a
              className="boton ancho whatsapp"
              href={enlaceWhatsapp(whatsapp, avisoPlan)}
              target={destinoWhatsapp}
              rel="noreferrer"
            >
              Avisar a {primerNombre} por WhatsApp
            </a>
          ) : (
            <p className="tenue">No tiene WhatsApp en su ficha para avisarle.</p>
          ))}
        {error && <p className="aviso-error">{error}</p>}
      </div>

      {revision && (
        <>
          <h3 className="subtitulo">Última revisión</h3>
          <RevisionResumen revision={revision} />
        </>
      )}

      <h3 className="subtitulo">Ficha</h3>
      {ficha ? <FichaResumen datos={ficha} /> : <p className="tenue">Todavía no envía su ficha.</p>}
    </>
  );
}

function Coach(): React.JSX.Element {
  const { perfil } = useCuenta();
  const [atletas, setAtletas] = useState<Perfil[]>([]);
  const [elegido, setElegido] = useState<Perfil | null>(null);
  const [verVideos, setVerVideos] = useState(false);
  const [verDashboard, setVerDashboard] = useState(false);
  const [verInvitaciones, setVerInvitaciones] = useState(false);
  const [error, setError] = useState('');

  const [version, setVersion] = useState(0);
  const cargar = () => setVersion((v) => v + 1);

  const [ultimos, setUltimos] = useState<Map<string, UltimoBloque>>(new Map());
  const [respondidas, setRespondidas] = useState<Set<string>>(new Set());
  const [fichasEspera, setFichasEspera] = useState<Map<string, FichaBreve>>(new Map());
  const [envios, setEnvios] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let vigente = true;
    supabase
      .from('perfiles')
      .select('*')
      .order('creado', { ascending: false })
      .then(({ data, error: e }) => {
        if (!vigente) return;
        if (e) setError(mensajeError(e));
        else {
          setError('');
          const lista = (data ?? []) as Perfil[];
          setAtletas(lista);
          // Para «Esperando su plan»: cuándo enviaron su ficha, su WhatsApp y cuándo quieren empezar
          fichasBreves(lista.filter((a) => a.estado === 'evaluacion').map((a) => a.id))
            .then((m) => vigente && setFichasEspera(m))
            .catch(() => undefined);
        }
      });
    ultimosEnvios('guia')
      .then((m) => vigente && setEnvios(m))
      .catch(() => undefined);
    ultimosBloques()
      .then((m) => vigente && setUltimos(m))
      .catch(() => undefined);
    revisionesRespondidas()
      .then((r) => vigente && setRespondidas(r))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version]);

  const alertas = alertasRenovacion(atletas, ultimos, hoyISO());
  const porId = new Map(atletas.map((a) => [a.id, a]));
  const pendientes = atletas.filter((a) => a.estado === 'ficha' && a.rol !== 'coach');
  const esperando = atletas.filter(
    (a) => a.estado === 'evaluacion' || (a.rol !== 'coach' && Boolean(a.ficha_modificada)),
  );
  const hoy = hoyISO();
  const modificadas = atletas.filter((a) => a.rol !== 'coach' && Boolean(a.ficha_modificada));
  // Activos que tienen pendiente la guía mensual: se marca en su fila y el correo está en su ficha
  const guiaAl = (a: Perfil) =>
    a.rol !== 'coach' && a.estado === 'activo' && Boolean(a.correo) && guiaPendiente(envios.get(a.id), hoy);
  function cambioGuia(atletaId: string, enviado: string | null) {
    setEnvios((m) => {
      const n = new Map(m);
      if (enviado) n.set(atletaId, enviado);
      else n.delete(atletaId);
      return n;
    });
  }

  const grupos = ordenEstado
    .map((estado) => ({ estado, lista: atletas.filter((a) => a.estado === estado) }))
    .filter((g) => g.lista.length);

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          {verDashboard ? (
            <Dashboard atletas={atletas} onVolver={() => setVerDashboard(false)} />
          ) : verInvitaciones ? (
            <Invitaciones onVolver={() => setVerInvitaciones(false)} />
          ) : verVideos ? (
            <BibliotecaVideos onVolver={() => setVerVideos(false)} />
          ) : elegido ? (
            <DetalleAtleta
              atleta={elegido}
              esYo={elegido.id === perfil?.id}
              ultimaGuia={envios.get(elegido.id)}
              onCambioGuia={cambioGuia}
              onVolver={() => {
                setElegido(null);
                cargar();
              }}
            />
          ) : (
            <>
              <header className="plan-cabecera">
                <h1>Coach</h1>
                <button className="enlace" onClick={cargar}>
                  Actualizar
                </button>
              </header>
              <button className="fila-atleta acceso-dashboard" onClick={() => setVerDashboard(true)}>
                <span>
                  <strong>📊 Dashboard</strong>
                </span>
                <span className="tenue">Cumplimiento y cargas ›</span>
              </button>
              <button className="fila-atleta acceso-invitaciones" onClick={() => setVerInvitaciones(true)}>
                <span>
                  <strong>🔒 Invitaciones</strong>
                </span>
                <span className="tenue">Códigos para crear cuenta ›</span>
              </button>
              <button className="fila-atleta acceso-videos" onClick={() => setVerVideos(true)}>
                <span>
                  <strong>▶ Videos de ejercicios</strong>
                </span>
                <span className="tenue">Tutoriales ›</span>
              </button>
              {modificadas.length > 0 && (
                <div className="alerta-fichas" role="status">
                  <p>
                    <strong>
                      🔔{' '}
                      {modificadas.length === 1
                        ? 'Un atleta cambió su ficha'
                        : `${modificadas.length} atletas cambiaron su ficha`}
                    </strong>
                    Revisa los cambios y ajusta su planificación.
                  </p>
                  <div className="fila-botones">
                    {modificadas.map((a) => (
                      <button key={a.id} className="boton" onClick={() => setElegido(a)}>
                        {a.apodo || a.nombre.split(' ')[0]} ›
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {alertas.length > 0 && (
                <section className="renovar">
                  <h3 className="subtitulo">Bloques por renovar · {alertas.length}</h3>
                  {alertas.map((al) => {
                    const a = porId.get(al.atletaId);
                    if (!a) return null;
                    return (
                      <button
                        key={al.atletaId}
                        className={`fila-atleta fila-renovar ${al.urgente ? 'urgente' : ''}`}
                        onClick={() => setElegido(a)}
                      >
                        <span>
                          <strong>{a.nombre || 'Sin nombre'}</strong>
                          {a.id === perfil?.id && <span className="tenue"> · tú</span>}
                          <span className="renovar-texto">{textoAlerta(al, fechaLarga)}</span>
                          <span className="renovar-texto">Próximo bloque desde el {fechaLarga(al.proximoInicio)}</span>
                          {al.bloque !== null && (
                            <span className="renovar-texto revision-estado">
                              {respondidas.has(`${al.atletaId}:${al.bloque}`)
                                ? '✓ Revisión respondida'
                                : '○ Revisión pendiente'}
                            </span>
                          )}
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </section>
              )}
              {pendientes.length > 0 && (
                <section>
                  <h3 className="subtitulo">Fichas pendientes · {pendientes.length}</h3>
                  {pendientes.map((a) => {
                    const numero = numeroWhatsapp(a.whatsapp);
                    const dias = diasEntre(fechaDeMarca(a.creado), hoyISO());
                    const apodo = a.apodo || a.nombre.split(' ')[0];
                    return (
                      <div key={a.id} className="tarjeta fila-pendiente">
                        <button className="enlace-fila" onClick={() => setElegido(a)}>
                          <strong>{a.nombre || 'Sin nombre'}</strong>
                          <span className="tenue">Creó su cuenta {haceDias(dias)} y no ha enviado su ficha</span>
                        </button>
                        {numero ? (
                          <a
                            className="boton whatsapp-boton"
                            href={enlaceWhatsapp(numero, mensajeFicha(apodo))}
                            target={destinoWhatsapp}
                            rel="noreferrer"
                          >
                            Recordar por WhatsApp
                          </a>
                        ) : a.correo ? (
                          <RecordarCorreo
                            correo={a.correo}
                            asunto="Tu ficha de entrenamiento"
                            mensaje={mensajeFicha(apodo)}
                          />
                        ) : (
                          <p className="tenue">Sin WhatsApp ni correo guardado.</p>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}
              {esperando.length > 0 && (
                <section>
                  <h3 className="subtitulo">Esperando su plan · {esperando.length}</h3>
                  {esperando.map((a) =>
                    a.estado === 'evaluacion' ? (
                      <TarjetaEspera
                        key={a.id}
                        atleta={a}
                        ficha={fichasEspera.get(a.id)}
                        onAbrir={() => setElegido(a)}
                      />
                    ) : (
                      <TarjetaFichaModificada key={a.id} atleta={a} onAbrir={() => setElegido(a)} onRevisado={cargar} />
                    ),
                  )}
                </section>
              )}
              {error && <p className="aviso-error">{error}</p>}
              {grupos.map((g) => (
                <section key={g.estado}>
                  <h3 className="subtitulo">
                    {textoEstado[g.estado]} · {g.lista.length}
                  </h3>
                  {g.lista.map((a) => (
                    <button key={a.id} className="fila-atleta" onClick={() => setElegido(a)}>
                      <span>
                        <strong>{a.nombre || 'Sin nombre'}</strong>
                        {a.id === perfil?.id && <span className="tenue"> · tú</span>}
                        {guiaAl(a) && <span className="etiqueta-guia">✉ Guía pendiente</span>}
                      </span>
                      <span className="tenue">{new Date(a.creado).toLocaleDateString('es-CL')} ›</span>
                    </button>
                  ))}
                </section>
              ))}
              {!error && atletas.length === 0 && <p className="tenue">Aún no hay atletas inscritos.</p>}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Coach;
