// Capa de componentes: "Registro al terminar" (RPE, lumbar, sueño, notas y campos del día)

import { useState } from 'react';

import type { Dia, Plan } from '../data/plan';
import type { RegistroDia } from '../data/registro';

interface Props {
  dia: Dia;
  reglas: Plan['reglas'];
  abierta: boolean;
  registro: RegistroDia;
  onAlternar: () => void;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
  onRegistrar?: () => Promise<boolean>; // true = llegó a la nube
  soloLectura?: boolean;
}

type EstadoEnvio = 'inicio' | 'enviando' | 'nube' | 'local';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

function BotonRegistrar({
  registro,
  onRegistrar,
  soloLectura,
}: {
  registro: RegistroDia;
  onRegistrar?: () => Promise<boolean>;
  soloLectura: boolean;
}) {
  const [envio, setEnvio] = useState<EstadoEnvio>('inicio');

  const registrada = Boolean(registro.cerrada);
  const editadaDespues = registrada && registro.actualizado > (registro.cerrada as string);

  if (soloLectura) {
    return registrada ? (
      <p className="registrar-listo">
        <span className="registrar-check" aria-hidden="true">
          ✓
        </span>
        Sesión registrada a las {hora(registro.cerrada as string)}
      </p>
    ) : null;
  }

  async function registrar() {
    if (!onRegistrar || envio === 'enviando') return;
    setEnvio('enviando');
    const ok = await onRegistrar();
    setEnvio(ok ? 'nube' : 'local');
    try {
      navigator.vibrate?.(40);
    } catch {
      /* sin vibración */
    }
  }

  if (registrada && !editadaDespues && envio !== 'enviando') {
    return (
      <div className={`registrar-listo ${envio === 'local' ? 'local' : ''}`} role="status">
        <span className={`registrar-check ${envio === 'nube' ? 'nuevo' : ''}`} aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>{envio === 'local' ? 'Guardada en tu teléfono' : '¡Sesión registrada!'}</strong>
          <small>
            {envio === 'local'
              ? 'Sin conexión: tu coach la verá cuando la envíes de nuevo.'
              : `Guardada a las ${hora(registro.cerrada as string)}. Tu coach ya puede verla.`}
          </small>
          {envio === 'local' && (
            <button type="button" className="registrar-reintentar" onClick={registrar}>
              Reintentar envío
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="boton ancho registrar-sesion" onClick={registrar} disabled={envio === 'enviando'}>
      {envio === 'enviando' ? 'Guardando…' : editadaDespues ? 'Actualizar registro' : 'Registrar sesión'}
    </button>
  );
}

function Escala({
  desde,
  hasta,
  valor,
  onElegir,
  etiqueta,
}: {
  desde: number;
  hasta: number;
  valor?: number;
  onElegir: (v?: number) => void;
  etiqueta: string;
}) {
  return (
    <div className="escala" role="group" aria-label={etiqueta}>
      {Array.from({ length: hasta - desde + 1 }, (_, k) => desde + k).map((n) => (
        <button
          key={n}
          type="button"
          className={valor === n ? 'elegido' : ''}
          onClick={() => onElegir(valor === n ? undefined : n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function semaforo(reg: RegistroDia, reglas: Plan['reglas']) {
  const valores = [reg.lumbarAntes, reg.lumbarDespues].filter((v): v is number => v !== undefined);
  if (!valores.length) return null;
  const max = Math.max(...valores);
  const s = reglas?.lumbar_semaforo ?? {};
  if (max <= 3) return { color: 'verde', texto: s.verde ?? 'Entrena normal' };
  if (max <= 5) return { color: 'amarillo', texto: s.amarillo ?? 'Versión B' };
  return { color: 'rojo', texto: s.rojo ?? 'Detener y consultar' };
}

function RegistroCierre({
  dia,
  reglas,
  abierta,
  registro,
  onAlternar,
  onCambiar,
  onRegistrar,
  soloLectura = false,
}: Props): React.JSX.Element {
  const luz = semaforo(registro, reglas);
  const esDescanso = dia.tipo === 'descanso';

  return (
    <section className={`seccion ${abierta ? 'abierta' : ''}`}>
      <button className="seccion-barra" onClick={onAlternar} aria-expanded={abierta}>
        <span className="seccion-titulo">Registro al terminar</span>
        <span className="seccion-flecha" aria-hidden="true">
          ›
        </span>
      </button>

      {abierta && (
        <fieldset className="seccion-cuerpo registro" disabled={soloLectura}>
          {dia.tipo === 'clase' && (
            <label className="campo-texto">
              <span>Qué hiciste en clase</span>
              <textarea
                rows={4}
                placeholder="Ejercicios, series con kg y reps"
                value={registro.clase ?? ''}
                onChange={(e) => onCambiar({ clase: e.target.value })}
              />
            </label>
          )}

          {(dia.registro ?? []).map((campo) => (
            <label key={campo} className="campo-texto">
              <span>{campo}</span>
              <input
                value={registro.campos[campo] ?? ''}
                onChange={(e) => onCambiar({ campos: { ...registro.campos, [campo]: e.target.value } })}
              />
            </label>
          ))}

          {!esDescanso && (
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
              {reglas?.lumbar_semaforo && (
                <>
                  <div className="campo-texto">
                    <span>Lumbar antes (0-10)</span>
                    <Escala
                      desde={0}
                      hasta={10}
                      valor={registro.lumbarAntes}
                      onElegir={(v) => onCambiar({ lumbarAntes: v })}
                      etiqueta="Lumbar antes"
                    />
                  </div>
                  <div className="campo-texto">
                    <span>Lumbar después (0-10)</span>
                    <Escala
                      desde={0}
                      hasta={10}
                      valor={registro.lumbarDespues}
                      onElegir={(v) => onCambiar({ lumbarDespues: v })}
                      etiqueta="Lumbar después"
                    />
                  </div>
                  {luz && <p className={`semaforo ${luz.color}`}>{luz.texto}</p>}
                </>
              )}
            </>
          )}

          <label className="campo-texto">
            <span>Sueño / Body Battery</span>
            <input
              placeholder="ej. 7 h · 65"
              value={registro.sueno ?? ''}
              onChange={(e) => onCambiar({ sueno: e.target.value })}
            />
          </label>

          <label className="campo-texto">
            <span>Notas y sensaciones</span>
            <textarea rows={3} value={registro.notas ?? ''} onChange={(e) => onCambiar({ notas: e.target.value })} />
          </label>

          <BotonRegistrar
            key={registro.fecha}
            registro={registro}
            onRegistrar={onRegistrar}
            soloLectura={soloLectura}
          />
        </fieldset>
      )}
    </section>
  );
}

export default RegistroCierre;
