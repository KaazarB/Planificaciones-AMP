// Capa de componentes: tarjeta que muestra una sesión

import { IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/react';
import type { Sesion } from '../data/semana';

const colorPorTipo: Record<Sesion['tipo'], string> = {
  CrossFit: 'primary',
  Halterofilia: 'secondary',
  Running: 'tertiary',
  Descanso: 'medium',
};

function SesionCard({ sesion }: { sesion: Sesion }) {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardSubtitle>
          {sesion.dia} · {sesion.fecha}
        </IonCardSubtitle>
        <IonCardTitle>{sesion.titulo}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonBadge color={colorPorTipo[sesion.tipo]}>{sesion.tipo}</IonBadge>
        <p>{sesion.detalle}</p>
      </IonCardContent>
    </IonCard>
  );
}

export default SesionCard;
