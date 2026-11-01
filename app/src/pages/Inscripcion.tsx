// Capa de pantallas: ficha de inscripción (primer ingreso del atleta)

import { IonContent, IonPage } from '@ionic/react';

import FichaFormulario from '../components/FichaFormulario';
import { useCuenta } from '../context/Cuenta';
import { enviarFicha, salir } from '../services/cuenta';

function Inscripcion(): React.JSX.Element {
  const { perfil, recargar } = useCuenta();
  if (!perfil) return <></>;

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          <header className="plan-cabecera">
            <h1>Hola {perfil.apodo || perfil.nombre}</h1>
            <button className="enlace" onClick={salir}>
              Salir
            </button>
          </header>
          <p className="dia-objetivo">
            Antes de armar tu planificación necesito conocerte. Son unos 10 minutos y puedes volver atrás cuando
            quieras.
          </p>
          <FichaFormulario
            usuarioId={perfil.id}
            textoEnviar="Enviar ficha"
            onEnviar={async (datos) => {
              await enviarFicha(perfil.id, datos);
              await recargar();
            }}
          />
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Inscripcion;
