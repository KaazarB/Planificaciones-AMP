// Capa de pantallas: Planificación del atleta conectado

import { IonContent, IonPage } from '@ionic/react';

import PlanVista from '../components/PlanVista';
import { useCuenta } from '../context/Cuenta';
import { guardarApodo } from '../services/cuenta';

function Tab1(): React.JSX.Element {
  const { perfil, cambiarPerfil } = useCuenta();
  const atleta = perfil?.id ?? '';
  const apodo = perfil?.apodo || perfil?.nombre.split(' ')[0] || '';

  function cambiarApodo() {
    const nuevo = window.prompt('¿Cómo quieres que aparezca tu nombre?', apodo)?.trim();
    if (!nuevo) return;
    const corto = nuevo.slice(0, 16);
    cambiarPerfil({ apodo: corto });
    guardarApodo(atleta, corto).catch(() => undefined);
  }

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          {atleta && <PlanVista key={atleta} atleta={atleta} apodo={apodo} onCambiarApodo={cambiarApodo} />}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Tab1;
