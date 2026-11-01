// Capa de pantallas: panel del coach (atletas, fichas y carga de planes)

import { IonContent, IonPage } from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';

import BibliotecaVideos from '../components/BibliotecaVideos';
import FichaResumen from '../components/FichaResumen';
import { useCuenta } from '../context/Cuenta';
import type { DatosFicha } from '../data/ficha';
import type { Plan } from '../data/plan';
import type { Estado, Perfil } from '../services/cuenta';
import { leerFicha, mensajeError } from '../services/cuenta';
import type { FilaPlan } from '../services/plan';
import { borrarPlan, planesDe, subirPlan, validarPlan } from '../services/plan';
import { supabase } from '../services/supabase';

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

// Deja el número listo para WhatsApp: solo dígitos y con código de Chile si falta
function numeroWhatsapp(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  let n = valor.replace(/\D/g, '');
  if (n.length === 9 && n.startsWith('9')) n = `56${n}`;
  if (n.length === 8) n = `569${n}`;
  return n.length >= 10 ? n : '';
}

// En el teléfono abre la app de WhatsApp directo; en el computador, WhatsApp Web
const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const destinoWhatsapp = esMovil ? undefined : '_blank';

function enlaceWhatsapp(numero: string, texto = ''): string {
  const t = texto ? `&text=${texto}` : '';
  return esMovil ? `whatsapp://send?phone=${numero}${t}` : `https://web.whatsapp.com/send?phone=${numero}${t}`;
}

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  const dia = f.toLocaleDateString('es-CL', { weekday: 'long' });
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });
  return `${dia} ${d} de ${mes}`;
};

const ordenEstado: Estado[] = ['evaluacion', 'activo', 'ficha', 'pausa'];

function DetalleAtleta({ atleta, esYo, onVolver }: { atleta: Perfil; esYo: boolean; onVolver: () => void }) {
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [planes, setPlanes] = useState<FilaPlan[]>([]);
  const [estado, setEstado] = useState<Estado>(atleta.estado);
  const [mensaje, setMensaje] = useState('');
  const [trabajando, setTrabajando] = useState('');
  const [pendiente, setPendiente] = useState<{ plan: Plan; resumen: string } | null>(null);
  const [porQuitar, setPorQuitar] = useState<FilaPlan | null>(null);
  const [planCargado, setPlanCargado] = useState('');
  const [error, setError] = useState('');

  const recargarPlanes = useCallback(() => planesDe(atleta.id).then(setPlanes), [atleta.id]);

  useEffect(() => {
    leerFicha(atleta.id).then(setFicha);
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

  const whatsapp = numeroWhatsapp(ficha?.whatsapp);
  const primerNombre = atleta.apodo || atleta.nombre.split(' ')[0];
  const enlaceApp = `${window.location.origin}${window.location.pathname}`;
  const avisoPlan = encodeURIComponent(
    `¡Hola ${primerNombre}! 💪 Ya está cargada tu planificación en la app (${planCargado}).\n\n` +
      `Ábrela desde el ícono o en este link: ${enlaceApp}\n\n` +
      'Revisa tu primera sesión y cualquier duda me escribes. ¡Vamos con todo!',
  );

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

      <div className="fila-botones">
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

      <h3 className="subtitulo">Planes</h3>
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
  const [error, setError] = useState('');

  const [version, setVersion] = useState(0);
  const cargar = () => setVersion((v) => v + 1);

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
          setAtletas((data ?? []) as Perfil[]);
        }
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  const grupos = ordenEstado
    .map((estado) => ({ estado, lista: atletas.filter((a) => a.estado === estado) }))
    .filter((g) => g.lista.length);

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          {verVideos ? (
            <BibliotecaVideos onVolver={() => setVerVideos(false)} />
          ) : elegido ? (
            <DetalleAtleta
              atleta={elegido}
              esYo={elegido.id === perfil?.id}
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
              <button className="fila-atleta acceso-videos" onClick={() => setVerVideos(true)}>
                <span>
                  <strong>▶ Videos de ejercicios</strong>
                </span>
                <span className="tenue">Tutoriales ›</span>
              </button>
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
