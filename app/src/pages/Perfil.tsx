// Capa de pantallas: mi perfil (nombre, ficha y salir)

import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';

import FichaFormulario from '../components/FichaFormulario';
import FichaResumen from '../components/FichaResumen';
import { useCuenta } from '../context/Cuenta';
import type { DatosFicha } from '../data/ficha';
import { enviarFicha, leerFicha, salir } from '../services/cuenta';

const textoEstado: Record<string, string> = {
  ficha: 'Ficha pendiente',
  evaluacion: 'En evaluación',
  activo: 'Activo',
  pausa: 'En pausa',
};

function Perfil(): React.JSX.Element {
  const { perfil, sesion } = useCuenta();
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (perfil)
      leerFicha(perfil.id)
        .then(setFicha)
        .catch(() => setFicha(null));
  }, [perfil]);

  if (!perfil) return <></>;

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          <header className="plan-cabecera">
            <h1>Mi perfil</h1>
          </header>

          <div className="tarjeta perfil-datos">
            <p className="perfil-nombre">{perfil.nombre}</p>
            <p>{sesion?.user.email}</p>
            <p>
              <span className="etiqueta">{perfil.rol === 'coach' ? 'Coach' : textoEstado[perfil.estado]}</span>
            </p>
          </div>

          {editando ? (
            <FichaFormulario
              usuarioId={perfil.id}
              inicial={ficha}
              textoEnviar="Guardar ficha"
              onEnviar={async (datos) => {
                await enviarFicha(perfil.id, datos);
                setFicha(datos);
                setEditando(false);
              }}
            />
          ) : (
            <>
              <div className="fila-botones">
                {perfil.rol !== 'coach' && (
                  <button className="boton secundario" onClick={() => setEditando(true)}>
                    {ficha ? 'Actualizar mi ficha' : 'Completar mi ficha'}
                  </button>
                )}
                <button className="boton secundario" onClick={salir}>
                  Cerrar sesión
                </button>
              </div>
              {ficha && <FichaResumen datos={ficha} />}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Perfil;
