// Capa de pantallas: «Progreso» del atleta conectado (cumplimiento semanal y cómo avanza)

import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import MiProgreso from '../components/MiProgreso';
import { useCuenta } from '../context/Cuenta';
import type { DatosFicha } from '../data/ficha';
import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { hoyISO } from '../domain/fechas';
import { leerFicha, mensajeError } from '../services/cuenta';
import { cargarPlan } from '../services/plan';
import { leerLocales, sincronizar } from '../services/registros';

interface Datos {
  dias: Dia[];
  registros: Record<string, RegistroDia>;
  ficha: DatosFicha | null;
}

function Progreso(): React.JSX.Element {
  const { perfil } = useCuenta();
  const atleta = perfil?.id ?? '';
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const ultimaCarga = useRef(0);

  // Se recarga cada vez que entra a la pestaña: lo que acaba de anotar en el plan aparece al tiro
  const cargar = useCallback(() => {
    if (!atleta || Date.now() - ultimaCarga.current < 1500) return;
    ultimaCarga.current = Date.now();
    setError('');
    // Lo del teléfono primero (al instante) y después lo de la nube
    setDatos((d) => (d ? { ...d, registros: { ...d.registros, ...leerLocales(atleta) } } : d));
    Promise.all([cargarPlan(atleta), sincronizar(atleta), leerFicha(atleta).catch(() => null)])
      .then(([plan, { registros }, ficha]) => setDatos({ dias: plan?.dias ?? [], registros, ficha }))
      .catch((e) => setError(mensajeError(e)));
  }, [atleta]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useIonViewWillEnter(() => {
    cargar();
  });

  return (
    <IonPage>
      <IonContent className="plan">
        <div className="plan-envoltura">
          {error && !datos && <p className="aviso-error">No pudimos cargar tu progreso: {error}</p>}
          {!datos && !error && <p className="cargando">Cargando tu progreso…</p>}
          {datos && !datos.dias.length && (
            <>
              <header className="plan-cabecera">
                <h1>Mi progreso</h1>
              </header>
              <p className="tarjeta tenue">
                Cuando tu coach cargue tu plan, aquí verás tu cumplimiento de cada semana y cómo vas avanzando.
              </p>
            </>
          )}
          {datos && datos.dias.length > 0 && (
            <MiProgreso dias={datos.dias} registros={datos.registros} ficha={datos.ficha} hoy={hoyISO()} />
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default Progreso;
