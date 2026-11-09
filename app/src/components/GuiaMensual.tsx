// Capa de componentes: guía mensual por correo (app en el inicio + importancia del registro).
// Si está pendiente muestra Gmail y copiar; al abrir Gmail (o con «Ya lo envié») queda registrado el envío
// y el botón vuelve a aparecer a los 30 días.

import { useState } from 'react';

import { asuntoGuia, DIAS_ENTRE_GUIAS, guiaPendiente, mensajeGuia } from '../domain/correo';
import { diasEntre, fechaDeMarca, fechaLarga, haceDias, hoyISO, sumarDias } from '../domain/fechas';
import { enlaceApp } from '../domain/whatsapp';
import { deshacerEnvio, registrarEnvio } from '../services/correos';
import { mensajeError } from '../services/cuenta';
import type { Perfil } from '../services/cuenta';

import RecordarCorreo from './RecordarCorreo';

interface Props {
  atleta: Perfil;
  ultimo?: string; // último envío registrado (marca de tiempo)
  onCambio: (atletaId: string, enviado: string | null) => void;
}

function GuiaMensual({ atleta, ultimo, onCambio }: Props): React.JSX.Element | null {
  const [reciente, setReciente] = useState<{ id: number; enviado: string; anterior?: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  if (!atleta.correo) return null;

  const hoy = hoyISO();
  const apodo = atleta.apodo || atleta.nombre.split(' ')[0];

  async function marcar() {
    if (trabajando || reciente) return;
    setTrabajando(true);
    setError('');
    try {
      const r = await registrarEnvio(atleta.id, 'guia');
      setReciente({ ...r, anterior: ultimo });
      onCambio(atleta.id, r.enviado);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  }

  async function deshacer() {
    if (!reciente) return;
    setError('');
    try {
      await deshacerEnvio(reciente.id);
      onCambio(atleta.id, reciente.anterior ?? null);
      setReciente(null);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  if (reciente) {
    const proxima = sumarDias(fechaDeMarca(reciente.enviado), DIAS_ENTRE_GUIAS);
    return (
      <div className="guia-mensual">
        <p className="guia-estado enviada">
          ✓ Guía registrada hoy. Vuelve a aparecer el {fechaLarga(proxima)}.{' '}
          <button className="enlace" onClick={deshacer}>
            Deshacer
          </button>
        </p>
        {error && <p className="aviso-error">{error}</p>}
      </div>
    );
  }

  if (!guiaPendiente(ultimo, hoy)) {
    const enviada = fechaDeMarca(ultimo!);
    return (
      <p className="guia-estado tenue">
        Guía enviada {haceDias(diasEntre(enviada, hoy))} ({fechaLarga(enviada)}). Vuelve a estar disponible el{' '}
        {fechaLarga(sumarDias(enviada, DIAS_ENTRE_GUIAS))}.
      </p>
    );
  }

  return (
    <div className="guia-mensual">
      <p className="guia-estado tenue">
        {ultimo
          ? `Último envío ${haceDias(diasEntre(fechaDeMarca(ultimo), hoy))}: toca enviarla de nuevo`
          : 'Todavía no recibe la guía'}
      </p>
      <RecordarCorreo
        correo={atleta.correo}
        asunto={asuntoGuia}
        mensaje={mensajeGuia(apodo, enlaceApp())}
        textoBoton="Enviar guía por Gmail"
        onAbrir={marcar}
      />
      <button className="enlace guia-marcar" onClick={marcar} disabled={trabajando}>
        La envié de otra forma: marcar como enviada
      </button>
      {error && <p className="aviso-error">{error}</p>}
    </div>
  );
}

export default GuiaMensual;
