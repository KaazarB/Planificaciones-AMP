// Capa de componentes: dibuja una pregunta de la ficha según su tipo

import type { CampoFicha, DatosFicha } from '../data/ficha';
import { esFechaISO, fechaLarga, hoyISO, lunesDeISO, semanasEntre } from '../domain/fechas';

interface Props {
  campo: CampoFicha;
  datos: DatosFicha;
  onCambiar: (clave: string, valor: string | string[] | boolean) => void;
  autoFoco?: boolean; // ficha de una pregunta por pantalla: el cursor queda listo para escribir
}

function CampoFichaInput({ campo, datos, onCambiar, autoFoco = false }: Props): React.JSX.Element {
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
      else if (elegidos.includes(op))
        onCambiar(
          campo.clave,
          elegidos.filter((e) => e !== op),
        );
      else if (op === campo.exclusiva) onCambiar(campo.clave, [op]);
      else onCambiar(campo.clave, [...elegidos.filter((e) => e !== campo.exclusiva), op]);
    };
    return (
      <div className="campo-ficha">
        {etiqueta}
        {campo.ayuda && <span className="campo-ayuda">{campo.ayuda}</span>}
        <div
          className={`chips ${campo.tipo === 'opciones' && campo.opciones?.some((o) => o.length > 3) ? 'chips-unica' : ''}`}
          role="group"
          aria-label={campo.etiqueta}
        >
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
          {esFechaISO(valor) && campo.clave === 'inicio' && (
            <span className="campo-ayuda">Tu plan partiría el {fechaLarga(lunesDeISO(valor))}.</span>
          )}
          {esFechaISO(valor) && campo.clave !== 'inicio' && (
            <span className="campo-ayuda">
              {fechaLarga(valor)} · faltan {semanasEntre(hoyISO(), valor)} semanas.
            </span>
          )}
        </>
      ) : campo.tipo === 'area' ? (
        <textarea
          rows={3}
          autoFocus={autoFoco}
          value={(valor as string) ?? ''}
          onChange={(e) => onCambiar(campo.clave, e.target.value)}
        />
      ) : (
        <span className="con-unidad">
          <input
            autoFocus={autoFoco}
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
