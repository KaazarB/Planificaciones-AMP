// Capa de pantallas: Mi semana

import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import SesionCard from '../components/SesionCard';
import SesionDetalle from '../components/SesionDetalle';
import { semanaEjemplo } from '../data/semana';
import type { Sesion } from '../data/semana';
import './Tab1.css';

function Tab1() {
  const [seleccionada, setSeleccionada] = useState<Sesion | null>(null);

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
          <SesionCard key={sesion.id} sesion={sesion} onAbrir={() => setSeleccionada(sesion)} />
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
            {seleccionada && <SesionDetalle sesion={seleccionada} />}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}

export default Tab1;
