// Genera los iconos PWA de Sello (PNG 192 y 512, «any» y «maskable», y el
// apple-touch-icon) sin dependencias: dibuja píxel a píxel con sobremuestreo
// para bordes suaves y escribe el PNG con zlib. Coherente con Sol: fondo rojo
// de marca, sol amarillo asomando abajo y la almohadilla «#» de ficha.json
// en blanco. Se ejecuta con `bun scripts/generar-iconos.ts`.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROJO = [223, 23, 23] as const; // --brand
const AMARILLO = [255, 211, 77] as const; // el sol, como --brand-yellow del gradiente
const BLANCO = [255, 255, 255] as const;

type Diseno = {
  // Almohadilla «#»: centro (cy), media extensión y grosor de barra, en fracción del lado.
  cy: number;
  mitad: number;
  grosor: number;
  sol: number; // radio del sol, en fracción del lado (centro en la base, x = 0.5)
};

// «any»: llena el cuadrado. «maskable»: todo el dibujo dentro de la zona
// segura (círculo central del 80 %).
const ANY: Diseno = { cy: 0.4, mitad: 0.2, grosor: 0.06, sol: 0.34 };
const MASKABLE: Diseno = { cy: 0.44, mitad: 0.155, grosor: 0.05, sol: 0.3 };

function pinta(d: Diseno, lado: number, suavizado: number): Uint8Array {
  const px = new Uint8Array(lado * lado * 4);
  const enAlmohadilla = (x: number, y: number) =>
    // Dos barras verticales y dos horizontales que se cruzan.
    (Math.abs(Math.abs(x - 0.5) - 0.11) <= d.grosor / 2 &&
      Math.abs(y - d.cy) <= d.mitad) ||
    (Math.abs(Math.abs(y - d.cy) - 0.11) <= d.grosor / 2 &&
      Math.abs(x - 0.5) <= d.mitad);
  const enSol = (x: number, y: number) => {
    const dx = x - 0.5;
    const dy = y - 1; // centro en la base del icono: media luna asomando
    return dx * dx + dy * dy <= d.sol * d.sol;
  };

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < suavizado; sy++) {
        for (let sx = 0; sx < suavizado; sx++) {
          const u = (x + (sx + 0.5) / suavizado) / lado;
          const v = (y + (sy + 0.5) / suavizado) / lado;
          const c = enAlmohadilla(u, v)
            ? BLANCO
            : enSol(u, v)
              ? AMARILLO
              : ROJO;
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = suavizado * suavizado;
      const i = (y * lado + x) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = 255;
    }
  }
  return px;
}

// Codificador PNG mínimo: IHDR + IDAT (deflate) + IEND, sin filtros por línea.
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo: string, datos: Uint8Array): Buffer {
  const cabecera = Buffer.alloc(4);
  cabecera.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([
    Buffer.from(tipo, "latin1"),
    Buffer.from(datos),
  ]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([cabecera, cuerpo, crc]);
}

function png(lado: number, px: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // Cada línea con su byte de filtro 0 delante.
  const crudo = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    crudo[y * (lado * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * lado * 4, lado * 4).copy(
      crudo,
      y * (lado * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(crudo, { level: 9 })),
    trozo("IEND", new Uint8Array()),
  ]);
}

const suavizado = 4;
const destino = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
);
mkdirSync(destino, { recursive: true });

const ficheros: [string, number, Diseno][] = [
  ["icon-192.png", 192, ANY],
  ["icon-512.png", 512, ANY],
  ["icon-maskable-192.png", 192, MASKABLE],
  ["icon-maskable-512.png", 512, MASKABLE],
  ["apple-touch-icon.png", 180, ANY],
];

for (const [nombre, lado, diseno] of ficheros) {
  const ruta = join(destino, nombre);
  writeFileSync(ruta, png(lado, pinta(diseno, lado, suavizado)));
  console.log(`✓ ${nombre} (${lado}×${lado}) en ${dirname(ruta)}`);
}
