// Capa de componentes: muestra las respuestas de una ficha agrupadas por paso

import type { DatosFicha } from '../data/ficha';
import { pasosFicha } from '../data/ficha';

function texto(v: DatosFicha[string] | undefined): string {
  if (v === undefined || v === '' || v === false) return '';
  if (v === true) return 'Sí';
  if (Array.isArray(v)) return v.join(', ');
  return v;
}

function FichaResumen({ datos }: { datos: DatosFicha }): React.JSX.Element {
  return (
    <div className="ficha-resumen">
      {pasosFicha.map((paso) => {
        const filas = paso.campos
          .filter((c) => c.tipo !== 'check')
          .map((c) => ({ c, v: texto(datos[c.clave]) }))
          .filter((f) => f.v);
        if (!filas.length) return null;
        return (
          <section key={paso.titulo}>
            <h3>{paso.titulo}</h3>
            <dl>
              {filas.map(({ c, v }) => (
                <div key={c.clave}>
                  <dt>{c.etiqueta}</dt>
                  <dd>
                    {v}
                    {c.unidad ? ` ${c.unidad}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

export default FichaResumen;
