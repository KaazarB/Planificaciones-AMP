// Capa de pantallas: Mi semana

import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import SesionCard from '../components/SesionCard';
import SesionDetalle from '../components/SesionDetalle';
import RegistroForm from '../components/RegistroForm';
import { planificacion } from '../data/semana';
import type { Sesion } from '../data/semana';
import type { Registro } from '../data/registro';
import { guardarRegistro, leerRegistros } from '../services/registros';
import { lunesDe, sesionesDeLaSemana, sumarDias, textoSemana } from '../domain/semanas';
import './Tab1.css';

function Tab1() {
  const [lunes, setLunes] = useState<Date>(() => lunesDe(new Date()));
  const [seleccionada, setSeleccionada] = useState<Sesion | null>(null);
  const [registros, setRegistros] = useState<Record<string, Registro>>({});
  const [mostrarAviso] = useIonToast();

  const sesiones = sesionesDeLaSemana(planificacion, lunes);

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
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">
              <IonIcon slot="icon-only" icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle size="small">{textoSemana(lunes)}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">
              <IonIcon slot="icon-only" icon={chevronForward} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {sesiones.length === 0 && (
          <IonText color="medium">
            <p className="ion-padding">No hay sesiones planificadas para esta semana.</p>
          </IonText>
        )}

        {sesiones.map((sesion) => (
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