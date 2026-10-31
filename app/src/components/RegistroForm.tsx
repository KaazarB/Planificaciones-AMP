// Capa de componentes: formulario para registrar una sesión

import { useState } from 'react';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
} from '@ionic/react';
import type { Registro, Sensacion } from '../data/registro';

const sensaciones: Sensacion[] = ['Muy mal', 'Mal', 'Normal', 'Bien', 'Excelente'];

interface Props {
  sesionId: string;
  inicial?: Registro;
  onGuardar: (registro: Registro) => void;
}

function RegistroForm({ sesionId, inicial, onGuardar }: Props) {
  const [resultado, setResultado] = useState(inicial?.resultado ?? '');
  const [rpe, setRpe] = useState(inicial?.rpe ?? 7);
  const [sensacion, setSensacion] = useState<Sensacion>(inicial?.sensacion ?? 'Normal');
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');

  function guardar() {
    onGuardar({
      sesionId,
      resultado,
      rpe,
      sensacion,
      comentario,
      fecha: new Date().toISOString(),
    });
  }

  return (
    <IonList inset>
      <IonListHeader>
        <IonLabel color="primary">Mi registro</IonLabel>
      </IonListHeader>

      <IonItem>
        <IonTextarea
          label="Resultado"
          labelPlacement="stacked"
          placeholder="Cargas, tiempos, rondas..."
          autoGrow
          value={resultado}
          onIonInput={(e) => setResultado(e.detail.value ?? '')}
        />
      </IonItem>

      <IonItem lines="none">
        <IonLabel>Esfuerzo (RPE): {rpe}</IonLabel>
      </IonItem>
      <IonItem>
        <IonRange
          aria-label="Esfuerzo"
          min={1}
          max={10}
          step={1}
          snaps
          ticks
          pin
          value={rpe}
          onIonInput={(e) => setRpe(e.detail.value as number)}
        />
      </IonItem>

      <IonItem lines="none">
        <IonLabel>Sensación</IonLabel>
      </IonItem>
      <IonSegment
        scrollable
        value={sensacion}
        onIonChange={(e) => setSensacion(e.detail.value as Sensacion)}
      >
        {sensaciones.map((s) => (
          <IonSegmentButton key={s} value={s}>
            <IonLabel>{s}</IonLabel>
          </IonSegmentButton>
        ))}
      </IonSegment>

      <IonItem>
        <IonTextarea
          label="Comentario"
          labelPlacement="stacked"
          placeholder="¿Cómo te sentiste? ¿Algo que ajustar?"
          autoGrow
          value={comentario}
          onIonInput={(e) => setComentario(e.detail.value ?? '')}
        />
      </IonItem>

      <IonButton expand="block" className="ion-margin" onClick={guardar}>
        Guardar registro
      </IonButton>
    </IonList>
  );
}

export default RegistroForm;
