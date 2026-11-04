// Capa de componentes: "Registro al terminar" (RPE, lumbar, sueño, notas y campos del día)

import type { Dia, Plan } from '../data/plan';
import type { RegistroDia } from '../data/registro';

interface Props {
  dia: Dia;
  reglas: Plan['reglas'];
  abierta: boolean;
  registro: RegistroDia;
  onAlternar: () => void;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
  soloLectura?: boolean;
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
                <span>RPE (1-10)</span>
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
        </fieldset>
      )}
    </section>
  );
}

export default RegistroCierre;
