// Capa de pantallas: Mi semana

import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import SesionCard from '../components/SesionCard';
import { semanaEjemplo } from '../data/semana';
import './Tab1.css';

function Tab1() {
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
          <SesionCard key={sesion.dia} sesion={sesion} />
        ))}
      </IonContent>
    </IonPage>
  );
}

export default Tab1;