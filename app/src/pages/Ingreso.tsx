// Capa de pantallas: ingresar o crear cuenta

import { IonContent, IonPage } from '@ionic/react';
import { useState } from 'react';

import { crearCuenta, entrar, mensajeError } from '../services/cuenta';

function Ingreso(): React.JSX.Element {
  const [modo, setModo] = useState<'entrar' | 'crear'>('crear');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  // El link de invitación trae el código: …/movil/?codigo=AB12CD
  const [codigo, setCodigo] = useState(() => new URLSearchParams(window.location.search).get('codigo') ?? '');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    if (modo === 'crear' && !nombre.trim()) return setError('Escribe tu nombre.');
    if (modo === 'crear' && !codigo.trim()) return setError('Escribe el código de invitación que te dio tu coach.');
    if (!correo.trim() || !clave) return setError('Escribe tu correo y tu clave.');
    if (modo === 'crear' && clave.length < 8) return setError('La clave debe tener al menos 8 caracteres.');
    setTrabajando(true);
    try {
      if (modo === 'entrar') await entrar(correo, clave);
      else if (!(await crearCuenta(nombre, correo, clave, codigo))) {
        setAviso('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí con tu clave.');
        setModo('entrar');
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura ingreso">
          <p className="marca">AMP</p>
          <h1>Planificación</h1>
          <p className="ingreso-bajada">Tu entrenamiento, semana a semana, armado contigo.</p>

          <div className="selector" role="tablist">
            <button role="tab" aria-selected={modo === 'crear'} onClick={() => setModo('crear')}>
              Crear cuenta
            </button>
            <button role="tab" aria-selected={modo === 'entrar'} onClick={() => setModo('entrar')}>
              Ya tengo cuenta
            </button>
          </div>

          <form onSubmit={enviar} className="tarjeta">
            {modo === 'crear' && (
              <label className="campo-ficha">
                <span className="campo-etiqueta">Código de invitación</span>
                <input
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                />
                <span className="campo-ayuda">Te lo entrega tu coach junto con el link.</span>
              </label>
            )}
            {modo === 'crear' && (
              <label className="campo-ficha">
                <span className="campo-etiqueta">Nombre y apellido</span>
                <input autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
            )}
            <label className="campo-ficha">
              <span className="campo-etiqueta">Correo</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </label>
            <label className="campo-ficha">
              <span className="campo-etiqueta">Clave</span>
              <input
                type="password"
                autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
              {modo === 'crear' && <span className="campo-ayuda">Mínimo 8 caracteres</span>}
            </label>

            {error && <p className="aviso-error">{error}</p>}
            {aviso && <p className="aviso">{aviso}</p>}

            <button className="boton ancho" disabled={trabajando}>
              {trabajando ? 'Un momento…' : modo === 'crear' ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>

          {modo === 'entrar' && (
            <p className="ingreso-nota">¿Olvidaste tu clave? Escríbele a tu coach y te ayuda a recuperarla.</p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Ingreso;
