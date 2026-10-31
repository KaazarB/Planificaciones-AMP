// Capa de componentes: tarjeta que muestra una sesión

import { IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonText } from '@ionic/react';
import type { Sesion } from '../data/semana';

const colorPorTipo: Record<Sesion['tipo'], string> = {
  CrossFit: 'primary',
  Halterofilia: 'secondary',
  Running: 'tertiary',
  Descanso: 'medium',
};

interface Props {
  sesion: Sesion;
  registrada: boolean;
  onAbrir: () => void;
}

function SesionCard({ sesion, registrada, onAbrir }: Props) {
  return (
    <IonCard button onClick={onAbrir}>
      <IonCardHeader>
        <IonCardSubtitle>
          {sesion.dia} · {sesion.fecha}
        </IonCardSubtitle>
        <IonCardTitle>{sesion.titulo}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonBadge color={colorPorTipo[sesion.tipo]}>{sesion.tipo}</IonBadge>
        <p>{sesion.detalle}</p>
        {registrada && (
          <IonText color="primary">
            <p>✓ Registrada</p>
          </IonText>
        )}
      </IonCardContent>
    </IonCard>
  );
}

export default SesionCard;
