// Capa de componentes: una sección del día (barra negra que se abre y se cierra)

import { useState } from 'react';

import type { Campo, Item, Seccion } from '../data/plan';
import { claveItem } from '../data/plan';
import type { FilaSerie, RegistroDia } from '../data/registro';
import { progresoSeccion } from '../domain/progreso';
import { alternativasDe } from '../domain/sustituciones';
import { claveEjercicio } from '../domain/videos';
import type { Videos } from '../services/videos';

import VideoEjercicio from './VideoEjercicio';

const unidad: Record<Campo, string> = { kg: 'kg', reps: 'reps', seg: 'seg' };

interface Props {
  seccion: Seccion;
  indice: number;
  abierta: boolean;
  registro: RegistroDia;
  onAlternar: () => void;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
  videos?: Videos;
}

function SeccionPlan({ seccion, indice, abierta, registro, onAlternar, onCambiar, videos }: Props): React.JSX.Element {
  const progreso = progresoSeccion(seccion, indice, registro);
  const [videoAbierto, setVideoAbierto] = useState<string | null>(null);
  const [cambioAbierto, setCambioAbierto] = useState<string | null>(null);

  // Si el atleta eligió una alternativa, se muestra esa (sin el peso sugerido del original)
  function efectivo(clave: string, item: Item): Item {
    const elegido = registro.sustituciones?.[clave];
    if (!elegido) return item;
    // Se quita el peso sugerido del original («· 20 kg», «· 2 × 8 kg», «· ~10 kg»)
    const presc = item.presc.replace(/\s·\s[^·]*\bkg\b[^·]*(?=\s·|$)/g, '');
    return { ...item, nombre: elegido, presc, kg: '', video: undefined };
  }

  function sustituir(clave: string, nombre: string | null) {
    const resto = { ...(registro.sustituciones ?? {}) };
    if (nombre) resto[clave] = nombre;
    else delete resto[clave];
    onCambiar({ sustituciones: resto });
    setCambioAbierto(null);
    setVideoAbierto(null);
  }

  // Botón ⇄ para ejercicios de máquina; dentro de una casilla no debe marcarla
  function botonCambio(clave: string, original: Item) {
    if (!alternativasDe(original).length) return null;
    const abierto = cambioAbierto === clave;
    return (
      <button
        type="button"
        className={`boton-cambio ${abierto ? 'abierto' : ''}`}
        aria-expanded={abierto}
        aria-label={`Cambiar ${original.nombre} por otro ejercicio`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCambioAbierto(abierto ? null : clave);
        }}
      >
        ⇄ Cambiar
      </button>
    );
  }

  function panelCambio(clave: string, original: Item) {
    const elegido = registro.sustituciones?.[clave];
    const aviso = elegido ? (
      <p className="sustituido">
        En vez de <strong>{original.nombre}</strong>
      </p>
    ) : null;
    if (cambioAbierto !== clave) return aviso;
    return (
      <>
        {aviso}
        <div className="panel-cambio">
          <p>¿No tienes la máquina? Elige una alternativa:</p>
          {alternativasDe(original).map((alt) => (
            <button
              key={alt}
              type="button"
              className={`opcion-cambio ${elegido === alt ? 'elegido' : ''}`}
              onClick={() => sustituir(clave, alt)}
            >
              {alt}
            </button>
          ))}
          {elegido && (
            <button type="button" className="enlace" onClick={() => sustituir(clave, null)}>
              Volver a {original.nombre}
            </button>
          )}
        </div>
      </>
    );
  }

  const videoDe = (item: Item) => item.video || videos?.get(claveEjercicio(item.nombre));

  // Botón ▶ junto al nombre; dentro de una casilla no debe marcarla
  function botonVideo(clave: string, item: Item) {
    if (!videoDe(item)) return null;
    const abierto = videoAbierto === clave;
    return (
      <button
        type="button"
        className={`boton-video ${abierto ? 'abierto' : ''}`}
        aria-expanded={abierto}
        aria-label={`${abierto ? 'Ocultar' : 'Ver'} técnica de ${item.nombre}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVideoAbierto(abierto ? null : clave);
        }}
      >
        {abierto ? '✕ Cerrar' : '▶ Ver técnica'}
      </button>
    );
  }

  function video(clave: string, item: Item) {
    const url = videoDe(item);
    return videoAbierto === clave && url ? <VideoEjercicio url={url} nombre={item.nombre} /> : null;
  }

  function marcar(clave: string) {
    onCambiar({ checks: { ...registro.checks, [clave]: !registro.checks[clave] } });
  }

  function escribirSerie(clave: string, fila: number, campo: Campo, valor: string, total: number) {
    const filas: FilaSerie[] = Array.from({ length: total }, (_, k) => ({ ...(registro.series[clave]?.[k] ?? {}) }));
    filas[fila][campo] = valor;
    onCambiar({ series: { ...registro.series, [clave]: filas } });
  }

  return (
    <section className={`seccion ${abierta ? 'abierta' : ''}`}>
      <button className="seccion-barra" onClick={onAlternar} aria-expanded={abierta}>
        <span className="seccion-titulo">{seccion.titulo}</span>
        {progreso && (
          <span className={`seccion-conteo ${progreso[0] === progreso[1] ? 'completo' : ''}`}>
            {progreso[0]}/{progreso[1]}
          </span>
        )}
        <span className="seccion-flecha" aria-hidden="true">
          ›
        </span>
      </button>

      {abierta && (
        <div className="seccion-cuerpo">
          {seccion.items.map((itemPlan, ii) => {
            let item = itemPlan;
            const clave = claveItem(indice, ii);
            const original = item;
            item = efectivo(clave, original);

            if (seccion.check) {
              const hecho = Boolean(registro.checks[clave]);
              return (
                <div key={clave} className="item-envoltura">
                  <label className={`item item-check ${hecho ? 'hecho' : ''}`}>
                    <input type="checkbox" checked={hecho} onChange={() => marcar(clave)} />
                    <span className="caja" aria-hidden="true" />
                    <span className="item-texto">
                      <span className="item-nombre">{item.nombre}</span>
                      {botonVideo(clave, item)}
                      {botonCambio(clave, original)}
                    </span>
                    <span className="item-presc">{item.presc}</span>
                  </label>
                  {panelCambio(clave, original)}
                  {video(clave, item)}
                </div>
              );
            }

            if (item.series && item.campos?.length) {
              const campos = item.campos;
              return (
                <div key={clave} className="item item-series">
                  <div className="item-cabeza">
                    <span className="item-texto">
                      <span className="item-nombre">{item.nombre}</span>
                      {botonVideo(clave, item)}
                      {botonCambio(clave, original)}
                    </span>
                    <span className="item-presc">{item.presc}</span>
                  </div>
                  {panelCambio(clave, original)}
                  {video(clave, item)}
                  {Array.from({ length: item.series }, (_, k) => (
                    <div key={k} className="fila-serie">
                      <span className="num-serie">{k + 1}</span>
                      {campos.map((campo) => (
                        <label key={campo} className="campo">
                          <input
                            inputMode={campo === 'kg' ? 'decimal' : 'numeric'}
                            placeholder={campo === 'kg' ? (item.kg ?? '') : (item.obj ?? '')}
                            value={registro.series[clave]?.[k]?.[campo] ?? ''}
                            onChange={(e) => escribirSerie(clave, k, campo, e.target.value, item.series!)}
                            aria-label={`${item.nombre} serie ${k + 1} ${unidad[campo]}`}
                          />
                          <span>{unidad[campo]}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div key={clave} className="item-envoltura">
                <div className="item item-info">
                  <span className="item-texto">
                    <span className="item-nombre">{item.nombre}</span>
                    {botonVideo(clave, item)}
                    {botonCambio(clave, original)}
                  </span>
                  <span className="item-presc">{item.presc}</span>
                </div>
                {panelCambio(clave, original)}
                {video(clave, item)}
              </div>
            );
          })}
          {seccion.nota && <p className="seccion-nota">{seccion.nota}</p>}
        </div>
      )}
    </section>
  );
}

export default SeccionPlan;
