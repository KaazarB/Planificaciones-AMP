import {
  IonApp,
  IonBadge,
  IonContent,
  IonIcon,
  IonPage,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactHashRouter } from '@ionic/react-router';
import { calendarOutline, peopleOutline, personCircleOutline, statsChartOutline } from 'ionicons/icons';
import { Navigate, Route } from 'react-router-dom';

import { CuentaProvider, useCuenta } from './context/Cuenta';
import { useRenovaciones } from './context/useRenovaciones';
import Coach from './pages/Coach';
import Espera from './pages/Espera';
import Ingreso from './pages/Ingreso';
import Inscripcion from './pages/Inscripcion';
import Perfil from './pages/Perfil';
import Progreso from './pages/Progreso';
import Tab1 from './pages/Tab1';
import { salir } from './services/cuenta';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */

/* Theme variables */
import './theme/variables.css';
import './pages/Tab1.css';
import './theme/pantallas.css';

setupIonicReact();

function Mensaje({ texto, conSalir }: { texto: string; conSalir?: boolean }) {
  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          <p className="cargando">{texto}</p>
          {conSalir && (
            <button className="boton secundario" onClick={salir}>
              Cerrar sesión
            </button>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

// Ionic no acepta hijos vacíos (false/null) en las pestañas: se arma la lista solo con lo que corresponde
function Pestanas({ coach }: { coach: boolean }) {
  const porRenovar = useRenovaciones(coach);
  const rutas = [
    <Route key="plan" path="/plan" element={<Tab1 />} />,
    <Route key="progreso" path="/progreso" element={<Progreso />} />,
    <Route key="perfil" path="/perfil" element={<Perfil />} />,
    ...(coach ? [<Route key="coach" path="/coach" element={<Coach />} />] : []),
    <Route key="resto" path="*" element={<Navigate to={coach ? '/coach' : '/plan'} replace />} />,
  ];
  const botones = [
    <IonTabButton key="plan" tab="plan" href="/plan">
      <IonIcon aria-hidden="true" icon={calendarOutline} />
      <IonLabel>Plan</IonLabel>
    </IonTabButton>,
    <IonTabButton key="progreso" tab="progreso" href="/progreso">
      <IonIcon aria-hidden="true" icon={statsChartOutline} />
      <IonLabel>Progreso</IonLabel>
    </IonTabButton>,
    ...(coach
      ? [
          <IonTabButton key="coach" tab="coach" href="/coach">
            <IonIcon aria-hidden="true" icon={peopleOutline} />
            <IonLabel>Coach</IonLabel>
            {porRenovar > 0 ? (
              <IonBadge color="danger" aria-label={`${porRenovar} pendientes del coach`}>
                {porRenovar}
              </IonBadge>
            ) : (
              <></>
            )}
          </IonTabButton>,
        ]
      : []),
    <IonTabButton key="perfil" tab="perfil" href="/perfil">
      <IonIcon aria-hidden="true" icon={personCircleOutline} />
      <IonLabel>Perfil</IonLabel>
    </IonTabButton>,
  ];
  return (
    <IonReactHashRouter>
      <IonTabs>
        <IonRouterOutlet>{rutas}</IonRouterOutlet>
        <IonTabBar slot="bottom">{botones}</IonTabBar>
      </IonTabs>
    </IonReactHashRouter>
  );
}

// Decide qué ve cada persona según su cuenta y su estado
function Contenido() {
  const { cargando, sesion, perfil, error } = useCuenta();
  if (cargando) return <Mensaje texto="Cargando…" />;
  if (!sesion) return <Ingreso />;
  if (!perfil) return <Mensaje texto={error || 'No encontramos tu perfil. Escríbele a tu coach.'} conSalir />;
  const coach = perfil.rol === 'coach';
  if (!coach && perfil.estado === 'ficha') return <Inscripcion />;
  if (!coach && perfil.estado === 'evaluacion') return <Espera />;
  return <Pestanas coach={coach} />;
}

const App: React.FC = () => (
  <IonApp>
    <CuentaProvider>
      <Contenido />
    </CuentaProvider>
  </IonApp>
);

export default App;
