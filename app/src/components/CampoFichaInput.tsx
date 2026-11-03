// Capa de componentes: dibuja una pregunta de la ficha según su tipo

import type { CampoFicha, DatosFicha } from '../data/ficha';
import { esFechaISO, fechaLarga, hoyISO, lunesDeISO } from '../domain/fechas';

interface Props {
  campo: CampoFicha;
  datos: DatosFicha;
  onCambiar: (clave: string, valor: string | string[] | boolean) => void;
}

function CampoFichaInput({ campo, datos, onCambiar }: Props): React.JSX.Element {
  const valor = datos[campo.clave];
  const etiqueta = (
    <span className="campo-etiqueta">
      {campo.etiqueta}
      {campo.requerido && campo.tipo !== 'check' && <span className="requerido"> *</span>}
    </span>
  );

  if (campo.tipo === 'check') {
    return (
      <label className="campo-check">
        <input type="checkbox" checked={valor === true} onChange={(e) => onCambiar(campo.clave, e.target.checked)} />
        <span>{campo.etiqueta}</span>
      </label>
    );
  }

  if (campo.tipo === 'tarjetas') {
    return (
      <div className="campo-ficha" role="radiogroup" aria-label={campo.etiqueta}>
        {etiqueta}
        {campo.opciones?.map((op) => (
          <button
            key={op}
            type="button"
            role="radio"
            aria-checked={valor === op}
            className={`tarjeta-opcion ${valor === op ? 'elegido' : ''}`}
            onClick={() => onCambiar(campo.clave, op)}
          >
            <strong>{op}</strong>
            {campo.descripciones?.[op] && <span>{campo.descripciones[op]}</span>}
          </button>
        ))}
      </div>
    );
  }

  if (campo.tipo === 'opciones' || campo.tipo === 'multi') {
    const elegidos = campo.tipo === 'multi' ? ((valor as string[]) ?? []) : [valor as string];
    const alternar = (op: string) => {
      if (campo.tipo === 'opciones') onCambiar(campo.clave, valor === op ? '' : op);
      else onCambiar(campo.clave, elegidos.includes(op) ? elegidos.filter((e) => e !== op) : [...elegidos, op]);
    };
    return (
      <div className="campo-ficha">
        {etiqueta}
        {campo.ayuda && <span className="campo-ayuda">{campo.ayuda}</span>}
        <div className="chips" role="group" aria-label={campo.etiqueta}>
          {campo.opciones?.map((op) => (
            <button
              key={op}
              type="button"
              className={`chip ${elegidos.includes(op) ? 'elegido' : ''}`}
              aria-pressed={elegidos.includes(op)}
              onClick={() => alternar(op)}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="campo-ficha">
      {etiqueta}
      {campo.ayuda && <span className="campo-ayuda">{campo.ayuda}</span>}
      {campo.tipo === 'fecha' ? (
        <>
          <input
            type="date"
            className="campo-fecha"
            min={hoyISO()}
            value={(valor as string) ?? ''}
            onChange={(e) => onCambiar(campo.clave, e.target.value)}
          />
          {esFechaISO(valor) && (
            <span className="campo-ayuda">Tu plan partiría el {fechaLarga(lunesDeISO(valor))}.</span>
          )}
        </>
      ) : campo.tipo === 'area' ? (
        <textarea rows={3} value={(valor as string) ?? ''} onChange={(e) => onCambiar(campo.clave, e.target.value)} />
      ) : (
        <span className="con-unidad">
          <input
            inputMode={campo.tipo === 'numero' ? 'decimal' : campo.clave === 'whatsapp' ? 'tel' : 'text'}
            value={(valor as string) ?? ''}
            onChange={(e) => onCambiar(campo.clave, e.target.value)}
          />
          {campo.unidad && <span>{campo.unidad}</span>}
        </span>
      )}
    </label>
  );
}

export default CampoFichaInput;
