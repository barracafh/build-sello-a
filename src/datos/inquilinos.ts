// Inquilinos verificados de las plataformas compartidas con comodín DNS
// (contexto.md, apartado 5.2 paso 6; comun/04b, apartados 6 y 7, leído el
// 12/10/2026 — no se edita 04b: los datos viven aquí). El comodín
// (*.sedelectronica.es, *.sedipualba.es, *.sede.dival.es, *.sede.gob.es) hace
// que cualquier nombre resuelva, así que el inquilino debe constar en esta
// lista para dar por oficial su sede. *.sede.gob.es no tiene inquilinos
// listados en 04b: sin constancia no se confirma nada.
export type Inquilino = {
  host: string;
  plataforma: string;
  entidad: string;
};

export const FUENTE_INQUILINOS = {
  nombre: "Sedipualba · entidades adheridas (plataforma de sedes compartidas)",
  url: "https://sedipualba.es/entidades-adheridas/",
};

export const INQUILINOS: Inquilino[] = [
  // *.sedipualba.es (Sedipualba)
  { host: "moncada.sedipualba.es", plataforma: "sedipualba.es", entidad: "Ajuntament de Montcada" },
  { host: "palma.sedipualba.es", plataforma: "sedipualba.es", entidad: "Ajuntament de Palma" },
  { host: "cartagena.sedipualba.es", plataforma: "sedipualba.es", entidad: "Ayuntamiento de Cartagena" },
  { host: "alquezar.sedipualba.es", plataforma: "sedipualba.es", entidad: "Ayuntamiento de Alquézar" },
  { host: "dphuesca.sedipualba.es", plataforma: "sedipualba.es", entidad: "Diputación Provincial de Huesca" },
  { host: "sede.dipualba.es", plataforma: "sedipualba.es", entidad: "Diputación de Albacete" },
  // *.sede.dival.es (SeDiVal: Sedipualba bajo dominio de la Diputació de València)
  { host: "rocafort.sede.dival.es", plataforma: "sede.dival.es", entidad: "Ajuntament de Rocafort" },
  { host: "www.sede.dival.es", plataforma: "sede.dival.es", entidad: "Diputació de València" },
  // *.sedelectronica.es (esPublico Gestiona)
  { host: "castello.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Ajuntament de Castelló de la Plana" },
  { host: "estepona.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Ayuntamiento de Estepona" },
  { host: "marbella.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Ayuntamiento de Marbella" },
  { host: "atarfe.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Ayuntamiento de Atarfe" },
  { host: "alcalali.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Ajuntament de l'Alcalalí" },
  { host: "diputacionalicante.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Diputación de Alicante" },
  { host: "dpz.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Diputación de Zaragoza" },
  { host: "dipcas.sedelectronica.es", plataforma: "sedelectronica.es", entidad: "Diputación de Castellón" },
];
