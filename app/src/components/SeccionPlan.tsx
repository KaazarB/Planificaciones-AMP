// Capa de componentes: una sección del día (barra negra que se abre y se cierra)

import type { Campo, Seccion } from '../data/plan';
import { claveItem } from '../data/plan';
import type { FilaSerie, RegistroDia } from '../data/registro';
import { progresoSeccion } from '../domain/progreso';

const unidad: Record<Campo, string> = { kg: 'kg', reps: 'reps', seg: 'seg' };

interface Props {
  seccion: Seccion;
  indice: number;
  abierta: boolean;
  registro: RegistroDia;
  onAlternar: () => void;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
}

function SeccionPlan({ seccion, indice, abierta, registro, onAlternar, onCambiar }: Props): React.JSX.Element {
  const progreso = progresoSeccion(seccion, indice, registro);

  function marcar(clave: string) {
    onCambiar({ checks: { ...registro.checks, [clave]: !registro.checks[clave] } });
  }

  function escribirSerie(clave: string, fila: number, campo: Campo, valor: string, total: number) {
    const filas: FilaSerie[] = Array.from({ length: total }, (_, k) => ({ ...(registro.series[clave]?.[k] ?? {}) }));
    filas[fila][campo] = valor;
    onCambiar({ series: { ...registro.series, [clave]: filas } });
  }

  return (
    <section className={`seccion ${abierta ? 'abierta' : ''}`}>
      <button className="seccion-barra" onClick={onAlternar} aria-expanded={abierta}>
        <span className="seccion-titulo">{seccion.titulo}</span>
        {progreso && (
          <span className={`seccion-conteo ${progreso[0] === progreso[1] ? 'completo' : ''}`}>
            {progreso[0]}/{progreso[1]}
          </span>
        )}
        <span className="seccion-flecha" aria-hidden="true">
          ›
        </span>
      </button>

      {abierta && (
        <div className="seccion-cuerpo">
          {seccion.items.map((item, ii) => {
            const clave = claveItem(indice, ii);

            if (seccion.check) {
              const hecho = Boolean(registro.checks[clave]);
              return (
                <label key={clave} className={`item item-check ${hecho ? 'hecho' : ''}`}>
                  <input type="checkbox" checked={hecho} onChange={() => marcar(clave)} />
                  <span className="caja" aria-hidden="true" />
                  <span className="item-nombre">{item.nombre}</span>
                  <span className="item-presc">{item.presc}</span>
                </label>
              );
            }

            if (item.series && item.campos?.length) {
              const campos = item.campos;
              return (
                <div key={clave} className="item item-series">
                  <div className="item-cabeza">
                    <span className="item-nombre">{item.nombre}</span>
                    <span className="item-presc">{item.presc}</span>
                  </div>
                  {Array.from({ length: item.series }, (_, k) => (
                    <div key={k} className="fila-serie">
                      <span className="num-serie">{k + 1}</span>
                      {campos.map((campo) => (
                        <label key={campo} className="campo">
                          <input
                            inputMode={campo === 'kg' ? 'decimal' : 'numeric'}
                            placeholder={campo === 'kg' ? (item.kg ?? '') : (item.obj ?? '')}
                            value={registro.series[clave]?.[k]?.[campo] ?? ''}
                            onChange={(e) => escribirSerie(clave, k, campo, e.target.value, item.series!)}
                            aria-label={`${item.nombre} serie ${k + 1} ${unidad[campo]}`}
                          />
                          <span>{unidad[campo]}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div key={clave} className="item item-info">
                <span className="item-nombre">{item.nombre}</span>
                <span className="item-presc">{item.presc}</span>
              </div>
            );
          })}
          {seccion.nota && <p className="seccion-nota">{seccion.nota}</p>}
        </div>
      )}
    </section>
  );
}

export default SeccionPlan;
