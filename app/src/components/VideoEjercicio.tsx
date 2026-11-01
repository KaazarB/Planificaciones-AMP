// Capa de componentes: video de YouTube incrustado bajo un ejercicio

import { idYoutube, inicioYoutube } from '../domain/videos';

function VideoEjercicio({ url, nombre }: { url: string; nombre: string }): React.JSX.Element {
  const id = idYoutube(url);
  if (!id) {
    return (
      <a className="video-enlace" href={url} target="_blank" rel="noreferrer">
        Abrir video de {nombre}
      </a>
    );
  }
  const inicio = inicioYoutube(url);
  return (
    <div className="video-marco">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${inicio ? `&start=${inicio}` : ''}`}
        title={`Técnica: ${nombre}`}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export default VideoEjercicio;
