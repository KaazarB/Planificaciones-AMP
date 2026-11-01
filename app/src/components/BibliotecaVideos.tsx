// Capa de componentes: el coach asigna un video de YouTube a cada ejercicio de los planes

import { useEffect, useState } from 'react';

import { claveEjercicio, idYoutube } from '../domain/videos';
import { mensajeError } from '../services/cuenta';
import { borrarVideo, ejerciciosDePlanes, guardarVideo, leerVideos } from '../services/videos';

import VideoEjercicio from './VideoEjercicio';

interface Fila {
  clave: string;
  nombre: string;
  veces: number;
}

function BibliotecaVideos({ onVolver }: { onVolver: () => void }): React.JSX.Element {
  const [ejercicios, setEjercicios] = useState<Fila[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [guardados, setGuardados] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<'todos' | 'sin' | 'con'>('sin');
  const [busqueda, setBusqueda] = useState('');
  const [viendo, setViendo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    Promise.all([ejerciciosDePlanes(), leerVideos()])
      .then(([lista, videos]) => {
        const g = Object.fromEntries(videos);
        setEjercicios(lista);
        setGuardados(g);
        setLinks(g);
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  async function guardar(f: Fila) {
    setError('');
    setAviso('');
    const url = (links[f.clave] ?? '').trim();
    try {
      if (!url) {
        await borrarVideo(f.nombre);
        const resto = { ...guardados };
        delete resto[f.clave];
        setGuardados(resto);
        setAviso(`Video quitado de «${f.nombre}».`);
        return;
      }
      if (!idYoutube(url)) return setError(`El link de «${f.nombre}» no parece de YouTube.`);
      await guardarVideo(f.nombre, url);
      setGuardados({ ...guardados, [f.clave]: url });
      setAviso(`Video guardado para «${f.nombre}».`);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  const q = claveEjercicio(busqueda);
  const visibles = ejercicios
    .filter((f) => (filtro === 'todos' ? true : filtro === 'con' ? guardados[f.clave] : !guardados[f.clave]))
    .filter((f) => !q || f.clave.includes(q));
  const conVideo = ejercicios.filter((f) => guardados[f.clave]).length;

  return (
    <>
      <button className="enlace volver" onClick={onVolver}>
        ‹ Atletas
      </button>
      <h2 className="dia-titulo">Videos de ejercicios</h2>
      <p className="dia-objetivo">
        Pega el link de YouTube de cada ejercicio. Aparecerá como «▶ Ver técnica» en el plan de todos los atletas que lo
        tengan.
      </p>
      <p className="tenue">
        {conVideo} de {ejercicios.length} ejercicios con video
      </p>

      <div className="selector">
        {(['sin', 'con', 'todos'] as const).map((f) => (
          <button key={f} aria-selected={filtro === f} onClick={() => setFiltro(f)}>
            {f === 'sin' ? 'Sin video' : f === 'con' ? 'Con video' : 'Todos'}
          </button>
        ))}
      </div>
      <label className="campo-ficha buscar">
        <input placeholder="Buscar ejercicio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </label>

      {aviso && <p className="aviso">{aviso}</p>}
      {error && <p className="aviso-error">{error}</p>}
      {cargando && <p className="tenue">Cargando ejercicios…</p>}
      {!cargando && ejercicios.length === 0 && (
        <p className="tenue">Aún no hay planes cargados. Los ejercicios aparecen aquí cuando cargas un plan.</p>
      )}

      {visibles.map((f) => {
        const actual = links[f.clave] ?? '';
        const cambiado = actual.trim() !== (guardados[f.clave] ?? '');
        return (
          <div key={f.clave} className="tarjeta fila-video">
            <div className="fila-video-cabeza">
              <strong>{f.nombre}</strong>
              <span className="tenue">
                {f.veces} {f.veces === 1 ? 'vez' : 'veces'}
              </span>
            </div>
            <div className="fila-video-campo">
              <input
                inputMode="url"
                placeholder="https://youtu.be/…"
                value={actual}
                onChange={(e) => setLinks({ ...links, [f.clave]: e.target.value })}
              />
              <button className="boton" disabled={!cambiado} onClick={() => guardar(f)}>
                Guardar
              </button>
            </div>
            {guardados[f.clave] && (
              <button className="enlace" onClick={() => setViendo(viendo === f.clave ? null : f.clave)}>
                {viendo === f.clave ? 'Ocultar video' : '▶ Probar video'}
              </button>
            )}
            {viendo === f.clave && guardados[f.clave] && <VideoEjercicio url={guardados[f.clave]} nombre={f.nombre} />}
          </div>
        );
      })}
    </>
  );
}

export default BibliotecaVideos;
