// Capa de componentes: recordar algo por correo sin depender del programa de correo del computador
// Abre Gmail en el navegador y, como respaldo, permite copiar el correo y el mensaje.

import { useState } from 'react';

import { enlaceGmail } from '../domain/correo';

interface Props {
  correo: string;
  asunto: string;
  mensaje: string;
  // Texto del botón de Gmail (por defecto «Recordar por Gmail»)
  textoBoton?: string;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function RecordarCorreo({ correo, asunto, mensaje, textoBoton = 'Recordar por Gmail' }: Props): React.JSX.Element {
  const [copiado, setCopiado] = useState('');

  async function copiarYAvisar(texto: string, que: string) {
    setCopiado((await copiar(texto)) ? `${que} copiado ✓` : 'No se pudo copiar: selecciónalo y cópialo a mano.');
    window.setTimeout(() => setCopiado(''), 2500);
  }

  return (
    <div className="recordar-correo">
      <p className="recordar-correo-direccion">
        ✉ <strong>{correo}</strong>
      </p>
      <div className="fila-botones">
        <a className="boton" href={enlaceGmail(correo, asunto, mensaje)} target="_blank" rel="noreferrer">
          {textoBoton}
        </a>
        <button className="boton secundario" onClick={() => copiarYAvisar(correo, 'Correo')}>
          Copiar correo
        </button>
        <button className="boton secundario" onClick={() => copiarYAvisar(mensaje, 'Mensaje')}>
          Copiar mensaje
        </button>
      </div>
      {copiado && <p className="tenue recordar-correo-aviso">{copiado}</p>}
    </div>
  );
}

export default RecordarCorreo;
