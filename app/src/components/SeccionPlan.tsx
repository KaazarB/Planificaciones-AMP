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

// «2 × 12» = dos mancuernas de 12 kg: la casilla muestra 12 y dice «kg c/u»
const dosMancuernas = (kg?: string) => /^2\s*×\s*/.test(kg ?? '');
const pesoGuia = (kg?: string) => (kg ?? '').replace(/^2\s*×\s*/, '');
// Valor sugerido para rellenar al marcar ✓: el primer número de la guía («~10» → «10», «máx» → nada)
const sugerido = (texto?: string) => (texto ?? '').match(/\d+(?:[.,]\d+)?/)?.[0] ?? '';

interface Props {
  seccion: Seccion;
  indice: number;
  abierta: boolean;
  registro: RegistroDia;
  onAlternar: () => void;
  onCambiar: (cambio: Partial<RegistroDia>) => void;
  videos?: Videos;
  soloLectura?: boolean;
}

function SeccionPlan({
  seccion,
  indice,
  abierta,
  registro,
  onAlternar,
  onCambiar,
  videos,
  soloLectura = false,
}: Props): React.JSX.Element {
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
    if (soloLectura || !alternativasDe(original).length) return null;
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

  function filasDe(clave: string, total: number): FilaSerie[] {
    return Array.from({ length: total }, (_, k) => ({ ...(registro.series[clave]?.[k] ?? {}) }));
  }

  function escribirSerie(clave: string, fila: number, campo: Campo, valor: string, total: number) {
    const filas = filasDe(clave, total);
    filas[fila][campo] = valor;
    onCambiar({ series: { ...registro.series, [clave]: filas } });
  }

  // ✓ de una serie: al marcarla se rellena lo vacío con lo indicado (peso guía y reps objetivo),
  // que sigue siendo editable; al desmarcarla se quita solo lo que se rellenó así
  function marcarSerie(clave: string, fila: number, item: Item) {
    const filas = filasDe(clave, item.series!);
    const f = filas[fila];
    const guia: Partial<Record<Campo, string>> = {
      kg: sugerido(pesoGuia(item.kg)),
      reps: sugerido(item.obj),
    };
    const campos = item.campos ?? [];
    if (f.hecha) {
      f.hecha = false;
      for (const c of campos) if (guia[c] && f[c] === guia[c]) delete f[c];
    } else {
      f.hecha = true;
      for (const c of campos) if (!f[c] && guia[c]) f[c] = guia[c];
    }
    onCambiar({ series: { ...registro.series, [clave]: filas } });
  }

  // Fila con casilla: la fila completa responde al toque (sin depender de que Safari active una casilla oculta)
  function filaCheck(clave: string, item: Item, original: Item, extra = '') {
    const hecho = Boolean(registro.checks[clave]);
    return (
      <div key={clave} className="item-envoltura">
        <div
          role="checkbox"
          aria-checked={hecho}
          aria-disabled={soloLectura}
          tabIndex={soloLectura ? -1 : 0}
          className={`item item-check ${extra} ${hecho ? 'hecho' : ''} ${soloLectura ? 'solo-lectura' : ''}`}
          onClick={() => !soloLectura && marcar(clave)}
          onKeyDown={(e) => {
            if (soloLectura || (e.key !== ' ' && e.key !== 'Enter')) return;
            e.preventDefault();
            marcar(clave);
          }}
        >
          <span className="caja" aria-hidden="true" />
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

            if (seccion.check) return filaCheck(clave, item, original);

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
                  </div>
                  {/* La indicación va en partes («3 series de 8 reps · Mancuernas de 12 kg · Esfuerzo 7/10») */}
                  <div className="presc-partes">
                    {item.presc.split(' · ').map((parte, ip) => (
                      <span key={ip} className={ip === 0 ? 'principal' : ''}>
                        {parte}
                      </span>
                    ))}
                  </div>
                  {panelCambio(clave, original)}
                  {video(clave, item)}
                  {Array.from({ length: item.series }, (_, k) => {
                    const fila = registro.series[clave]?.[k];
                    const hecha = Boolean(fila?.hecha);
                    return (
                      <div key={k} className={`fila-serie ${hecha ? 'hecha' : ''}`}>
                        <span className="num-serie">{k + 1}</span>
                        {campos.map((campo) => (
                          <label key={campo} className="campo">
                            <input
                              inputMode={campo === 'kg' ? 'decimal' : 'numeric'}
                              placeholder={campo === 'kg' ? pesoGuia(item.kg) : (item.obj ?? '')}
                              value={registro.series[clave]?.[k]?.[campo] ?? ''}
                              readOnly={soloLectura}
                              onChange={(e) => escribirSerie(clave, k, campo, e.target.value, item.series!)}
                              aria-label={`${item.nombre} serie ${k + 1} ${unidad[campo]}`}
                            />
                            <span>{campo === 'kg' && dosMancuernas(item.kg) ? 'kg c/u' : unidad[campo]}</span>
                          </label>
                        ))}
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={hecha}
                          disabled={soloLectura}
                          className={`caja caja-serie ${hecha ? 'hecha' : ''}`}
                          onClick={() => marcarSerie(clave, k, item)}
                          aria-label={`Serie ${k + 1} de ${item.nombre} hecha`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Ítems sueltos (WOD, técnica, notas) también se pueden marcar como hechos
            return filaCheck(clave, item, original, 'item-info');
          })}
          {seccion.nota && <p className="seccion-nota">{seccion.nota}</p>}
        </div>
      )}
    </section>
  );
}

export default SeccionPlan;
