// Capa de componentes: calendario mensual para saltar a cualquier fecha

import { useState } from 'react';

import type { Dia } from '../data/plan';
import { aTextoISO, lunesDe, sumarDias, textoMes } from '../domain/semanas';

const encabezados = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  fecha: string;
  hoy: string;
  porFecha: Map<string, Dia>;
  registrados: Set<string>;
  onElegir: (fecha: string) => void;
  onCerrar: () => void;
}

function Calendario({ fecha, hoy, porFecha, registrados, onElegir, onCerrar }: Props): React.JSX.Element {
  const [a, m] = fecha.split('-').map(Number);
  const [mes, setMes] = useState(new Date(a, m - 1, 1));

  const primerLunes = lunesDe(mes);
  // 6 semanas fijas para que el calendario no cambie de alto entre meses
  const celdas = Array.from({ length: 42 }, (_, k) => sumarDias(primerLunes, k));
  const titulo = textoMes(mes);

  const moverMes = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <div className="calendario-fondo" onClick={onCerrar}>
      <div
        className="calendario"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir fecha"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendario-cabeza">
          <button onClick={() => moverMes(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <span>{titulo}</span>
          <button onClick={() => moverMes(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>

        <div className="calendario-grilla">
          {encabezados.map((l, k) => (
            <span key={k} className="calendario-letra">
              {l}
            </span>
          ))}
          {celdas.map((d) => {
            const iso = aTextoISO(d);
            const dia = porFecha.get(iso);
            const fueraDeMes = d.getMonth() !== mes.getMonth();
            const clases = [
              'calendario-dia',
              iso === fecha ? 'activo' : '',
              iso === hoy ? 'hoy' : '',
              fueraDeMes ? 'fuera' : '',
              dia ? '' : 'sin-plan',
            ].join(' ');
            return (
              <button key={iso} className={clases} onClick={() => onElegir(iso)} aria-label={dia ? dia.dia : iso}>
                {d.getDate()}
                {(!dia || dia.tipo === 'descanso') && registrados.has(iso) && (
                  <span className="punto libre registrado" aria-hidden="true" />
                )}
                {dia && dia.tipo !== 'descanso' && (
                  <span
                    className={`punto ${dia.tipo} ${registrados.has(iso) ? 'registrado' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="calendario-pie">
          <button onClick={() => onElegir(hoy)}>Hoy</button>
          <button onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default Calendario;
