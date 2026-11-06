// Capa de lógica: enlaces de correo por Gmail en el navegador (no usa el programa de correo del computador)

export function enlaceGmail(para: string, asunto: string, cuerpo: string): string {
  const e = encodeURIComponent;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${e(para)}&su=${e(asunto)}&body=${e(cuerpo)}`;
}
