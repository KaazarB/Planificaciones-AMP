// Capa de componentes: detalle de una sesión con sus bloques

import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonText } from '@ionic/react';
import type { Sesion } from '../data/semana';

function SesionDetalle({ sesion }: { sesion: Sesion }) {
  return (
    <>
      <IonText color="medium">
        <p>
          {sesion.dia} · {sesion.fecha} · {sesion.tipo}
        </p>
      </IonText>
      {sesion.bloques.map((bloque) => (
        <IonCard key={bloque.nombre}>
          <IonCardHeader>
            <IonCardSubtitle color="primary">{bloque.nombre}</IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            {bloque.contenido.map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
          </IonCardContent>
        </IonCard>
      ))}
    </>
  );
}

export default SesionDetalle;
