/** Proveedores reales que la gente usa a menudo; las coincidencias exactas nunca se "corrigen". */
const KNOWN_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.es', 'ymail.com', 'icloud.com', 'me.com', 'mail.com', 'gmx.com', 'aol.com',
  'protonmail.com', 'proton.me',
];

/** Hasta este número de ediciones (insertar, borrar, cambiar) un dominio cuenta como errata de uno conocido. */
const MAX_DISTANCE = 2;

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

/**
 * "¿Quisiste decir...?" para erratas en dominios de correo comunes (gmial.com, hotmial.com, gmail.con).
 * Devuelve la dirección corregida, o null si el dominio está bien, es desconocido o está incompleto.
 * La parte antes de la @ se conserva tal cual.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!/^[^\s@]+\.[^\s@]{2,}$/.test(domain) || KNOWN_DOMAINS.includes(domain)) return null;

  let best: string | null = null;
  let bestDistance = MAX_DISTANCE + 1;
  for (const known of KNOWN_DOMAINS) {
    const distance = editDistance(domain, known);
    if (distance < bestDistance) {
      best = known;
      bestDistance = distance;
    }
  }
  return best ? `${local}@${best}` : null;
}
