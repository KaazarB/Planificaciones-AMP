// Capa de pantallas: Mi semana

import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import SesionCard from '../components/SesionCard';
import SesionDetalle from '../components/SesionDetalle';
import RegistroForm from '../components/RegistroForm';
import { semanaEjemplo } from '../data/semana';
import type { Sesion } from '../data/semana';
import type { Registro } from '../data/registro';
import { guardarRegistro, leerRegistros } from '../services/registros';
import './Tab1.css';

function Tab1() {
  const [seleccionada, setSeleccionada] = useState<Sesion | null>(null);
  const [registros, setRegistros] = useState<Record<string, Registro>>({});
  const [mostrarAviso] = useIonToast();

  useEffect(() => {
    leerRegistros()
      .then(setRegistros)
      .catch(() =>
        mostrarAviso({ message: 'No se pudieron cargar los registros', duration: 2500, color: 'danger', position: 'top' })
      );
  }, []);

  async function alGuardar(registro: Registro) {
    try {
      await guardarRegistro(registro);
      setRegistros(await leerRegistros());
      setSeleccionada(null);
      mostrarAviso({ message: 'Registro guardado ✓', duration: 1500, color: 'primary', position: 'top' });
    } catch {
      mostrarAviso({ message: 'Error al guardar. Revisa tu conexión.', duration: 2500, color: 'danger', position: 'top' });
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mi semana</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Mi semana</IonTitle>
          </IonToolbar>
        </IonHeader>

        {semanaEjemplo.map((sesion) => (
          <SesionCard
            key={sesion.id}
            sesion={sesion}
            registrada={Boolean(registros[sesion.id])}
            onAbrir={() => setSeleccionada(sesion)}
          />
        ))}

        <IonModal isOpen={seleccionada !== null} onDidDismiss={() => setSeleccionada(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{seleccionada?.titulo}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSeleccionada(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {seleccionada && (
              <>
                <SesionDetalle sesion={seleccionada} />
                <RegistroForm
                  key={seleccionada.id}
                  sesionId={seleccionada.id}
                  inicial={registros[seleccionada.id]}
                  onGuardar={alGuardar}
                />
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

export default Tab1;
