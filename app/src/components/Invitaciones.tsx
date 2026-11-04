// Capa de componentes: el coach crea, desactiva y comparte códigos de invitación

import { useEffect, useState } from 'react';

import { mensajeError } from '../services/cuenta';
import type { Invitacion } from '../services/invitaciones';
import {
  cambiarActivo,
  crearInvitacion,
  enlaceInvitacion,
  leerInvitaciones,
  mensajeInvitacion,
} from '../services/invitaciones';

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function Invitaciones({ onVolver }: { onVolver: () => void }): React.JSX.Element {
  const [lista, setLista] = useState<Invitacion[]>([]);
  const [version, setVersion] = useState(0);
  const [nota, setNota] = useState('');
  const [unSoloUso, setUnSoloUso] = useState(true);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [mostrar, setMostrar] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    leerInvitaciones()
      .then((l) => vigente && setLista(l))
      .catch((e) => vigente && setError(mensajeError(e)));
    return () => {
      vigente = false;
    };
  }, [version]);

  async function crear() {
    setError('');
    setAviso('');
    try {
      await crearInvitacion(nota.trim(), unSoloUso ? 1 : null);
      setNota('');
      setVersion((v) => v + 1);
      setAviso('Código creado. Cópialo y envíaselo a la persona.');
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function alternar(inv: Invitacion) {
    setError('');
    try {
      await cambiarActivo(inv.codigo, !inv.activo);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function copiarMensaje(inv: Invitacion) {
    if (await copiar(mensajeInvitacion(inv.codigo))) {
      setAviso(`Mensaje con el código ${inv.codigo} copiado. Pégalo en WhatsApp.`);
      setMostrar(null);
    } else setMostrar(inv.codigo);
  }

  return (
    <>
      <button className="enlace volver" onClick={onVolver}>
        ‹ Atletas
      </button>
      <h2 className="dia-titulo">Invitaciones</h2>
      <p className="dia-objetivo">
        Solo quien tenga un código activo puede crear una cuenta. Usa un código por persona para saber quién entró y
        desactívalo si deja de servir.
      </p>

      <div className="tarjeta">
        <label className="campo-ficha">
          <span className="campo-etiqueta">¿Para quién es?</span>
          <input placeholder="Ej. Camila, amigos del box" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        <label className="campo-check">
          <input type="checkbox" checked={unSoloUso} onChange={(e) => setUnSoloUso(e.target.checked)} />
          <span>Un solo uso (recomendado): sirve para crear una sola cuenta</span>
        </label>
        <button className="boton ancho" onClick={crear}>
          Crear código
        </button>
      </div>

      {aviso && <p className="aviso">{aviso}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <h3 className="subtitulo">Códigos</h3>
      {lista.length === 0 && !error && <p className="tenue">Aún no hay códigos.</p>}
      {lista.map((inv) => {
        const agotado = inv.usos_max !== null && inv.usos >= inv.usos_max;
        const vigente = inv.activo && !agotado;
        return (
          <div key={inv.codigo} className={`tarjeta fila-invitacion ${vigente ? '' : 'inactiva'}`}>
            <div className="fila-invitacion-cabeza">
              <span className="codigo">{inv.codigo}</span>
              <span className={`etiqueta ${vigente ? 'estado-activo' : 'estado-pausa'}`}>
                {!inv.activo ? 'Desactivado' : agotado ? 'Usado' : 'Activo'}
              </span>
            </div>
            <p className="tenue">
              {inv.nota || 'Sin nota'} · {inv.usos} {inv.usos === 1 ? 'cuenta creada' : 'cuentas creadas'}
              {inv.usos_max !== null ? ` de ${inv.usos_max}` : ' · sin límite'}
            </p>
            <div className="fila-botones">
              {vigente && (
                <button className="boton" onClick={() => copiarMensaje(inv)}>
                  Copiar invitación
                </button>
              )}
              <button className="boton secundario" onClick={() => alternar(inv)}>
                {inv.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            {mostrar === inv.codigo && (
              <textarea className="texto-copiar" readOnly rows={6} value={mensajeInvitacion(inv.codigo)} />
            )}
            {vigente && <p className="tenue enlace-invitacion">{enlaceInvitacion(inv.codigo)}</p>}
          </div>
        );
      })}
    </>
  );
}

export default Invitaciones;
