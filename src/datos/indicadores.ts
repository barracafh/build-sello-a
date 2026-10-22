// Dominios que una fuente oficial ha publicado EXPRESAMENTE como fraudulentos
// (contexto.md, apartado 5.2 paso 11 y 4.5). Copia local y fechada: los avisos
// de INCIBE no publican indicadores estructurados, así que aquí solo entran
// dominios citados como fraudulentos por su fuente, con enlace y fecha.
// Comparación: host exacto o subdominio. Nunca se visita ninguno.
export type Indicador = {
  dominio: string; // tal y como lo publica la fuente, sin neutralizar
  organismo: string; // al que dicen suplantar; nombre de datos/dominios-oficiales.json
  fuenteNombre: string;
  fuenteUrl: string;
  fecha: string; // fecha en que la fuente lo publicó o se consultó
};

const CIBERALERTAS_SS = {
  fuenteNombre: "Seguridad Social · Ciberalertas (SMS falsos que simulan Importass)",
  fuenteUrl: "https://www.seg-social.es/wps/portal/wss/internet/HerramientasWeb/ciberseguridad",
  fecha: "2026-10-12",
  organismo: "Seguridad Social (INSS / TGSS)",
};

export const INDICADORES: Indicador[] = [
  { dominio: "poratlesgsoical-gob.top", ...CIBERALERTAS_SS },
  { dominio: "portalseiq.eu.cc", ...CIBERALERTAS_SS },
  { dominio: "portal-seg-social.help", ...CIBERALERTAS_SS },
  { dominio: "portal.seg-socioal.cfd", ...CIBERALERTAS_SS },
  { dominio: "portaliseg-socialgobs.clik", ...CIBERALERTAS_SS },
];
