// Capa de pantallas: ficha enviada, esperando que el coach arme el plan

import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';

import FichaFormulario from '../components/FichaFormulario';
import FichaResumen from '../components/FichaResumen';
import { useCuenta } from '../context/Cuenta';
import type { DatosFicha } from '../data/ficha';
import { enviarFicha, leerFicha, salir } from '../services/cuenta';

function Espera(): React.JSX.Element {
  const { perfil, recargar } = useCuenta();
  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (perfil) leerFicha(perfil.id).then(setFicha);
  }, [perfil]);

  if (!perfil) return <></>;

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          <header className="plan-cabecera">
            <h1>Ficha recibida</h1>
            <button className="enlace" onClick={salir}>
              Salir
            </button>
          </header>

          {editando && ficha ? (
            <FichaFormulario
              modo="paso"
              usuarioId={perfil.id}
              inicial={ficha}
              textoEnviar="Guardar cambios"
              onEnviar={async (datos) => {
                await enviarFicha(perfil.id, datos);
                setFicha(datos);
                setEditando(false);
              }}
            />
          ) : (
            <>
              <div className="estado-tarjeta">
                <span className="etiqueta">En evaluación</span>
                <p>
                  ¡Gracias, {perfil.apodo || perfil.nombre}! Tu coach está revisando tu ficha y te escribirá por
                  WhatsApp para conversar y armar tu plan juntos. Cuando esté listo, aparecerá aquí.
                </p>
                <div className="fila-botones">
                  <button className="boton secundario" onClick={() => setEditando(true)} disabled={!ficha}>
                    Editar mi ficha
                  </button>
                  <button className="boton secundario" onClick={recargar}>
                    Actualizar
                  </button>
                </div>
              </div>
              {ficha && <FichaResumen datos={ficha} />}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Espera;
