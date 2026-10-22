import type { CSSProperties, ReactNode } from "react";
import {
  Car,
  ExternalLink,
  Landmark,
  Link2,
  Mail,
  MessageCircle,
  MessageSquareMore,
  Package,
  ReceiptEuro,
  WandSparkles,
} from "lucide-react";
import s from "./HeroVortice.module.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Bandas del vórtice, de fuera a dentro. w y h en % de un lienzo de 1440 × 832;
// dx/dy, el desplazamiento que orbita; d, segundos por vuelta.
const BANDAS = [
  { w: 173.6, h: 192.3, dx: 120, dy: 0, c: "#d6bbfb", t: -6, d: 220, b: 40 },
  { w: 152.8, h: 168.3, dx: 64, dy: 77, c: "#f9f5ff", t: 5, d: 190, b: 40 },
  { w: 134.7, h: 146.6, dx: -15, dy: 84, c: "#7f56d9", t: -4, d: 160, b: 36 },
  { w: 118.1, h: 127.4, dx: -61, dy: 35, c: "#42307d", t: 6, d: 135, b: 34 },
  { w: 102.8, h: 109.4, dx: -56, dy: -21, c: "#b692f6", t: -5, d: 115, b: 32 },
  { w: 88.9, h: 92.5, dx: -15, dy: -42, c: "#ffffff", t: 4, d: 98, b: 30 },
  { w: 75, h: 74.5, dx: 15, dy: -26, c: "#6941c6", t: -3, d: 84, b: 28 },
  { w: 62.5, h: 57.7, dx: 12, dy: -2, c: "#2c1c5f", t: 0, d: 72, b: 26 },
];

const sombra = "shadow-[0_18px_40px_rgba(44,28,95,0.35)]";

function Flotante({
  pos,
  f = 7,
  r = 0,
  className = "",
  children,
}: {
  pos: CSSProperties;
  f?: number;
  r?: number;
  className?: string;
  children: ReactNode;
}) {
  const estilo: Vars = { ...pos, "--f": `${f}s`, "--r": `${-r}s` };
  return (
    <div className={`${s.flotante} ${className}`} style={estilo}>
      {children}
    </div>
  );
}

function Aviso({ n, grande = false }: { n: number; grande?: boolean }) {
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full border-[3px] border-white bg-[#d92d20] font-bold text-white ${grande ? "-top-1.5 -left-1.5 size-[34px] text-[15px]" : "-top-2 -left-2 size-7 text-[13px]"}`}
    >
      {n}
    </span>
  );
}

function Ficha({
  tam,
  radio,
  fondo,
  giro = 0,
  aviso,
  children,
}: {
  tam: number;
  radio: number;
  fondo: string;
  giro?: number;
  aviso?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center justify-center ${fondo} ${sombra}`}
      style={{
        width: tam,
        height: tam,
        borderRadius: radio,
        transform: `rotate(${giro}deg)`,
      }}
    >
      {children}
      {aviso ? <Aviso n={aviso} /> : null}
    </div>
  );
}

const burbuja =
  "flex items-center gap-2.5 rounded-[14px] border border-white/15 bg-[#2c1c5f]/80 px-[18px] py-3.5 text-lg font-medium whitespace-nowrap text-white shadow-[0_14px_32px_rgba(44,28,95,0.35)] backdrop-blur-md";

function Remitente({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white py-[5px] pr-3.5 pl-[5px] text-[15px] font-semibold text-[#42307d] shadow-[0_10px_24px_rgba(44,28,95,0.25)]">
      <span className="flex size-7 items-center justify-center rounded-full bg-(--brand) text-white">
        {icono}
      </span>
      {children}
    </div>
  );
}

// La varita con su destello. El prefijo evita ids repetidos entre la versión
// de escritorio y la de móvil.
function Varita({ id, tam }: { id: string; tam: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 150 150"
      className="overflow-visible drop-shadow-[0_18px_24px_rgba(20,11,51,0.45)]"
    >
      <defs>
        <linearGradient id={`${id}-palo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f56d9" />
          <stop offset="0.45" stopColor="#2c1c5f" />
          <stop offset="1" stopColor="#140b33" />
        </linearGradient>
        <linearGradient id={`${id}-punta`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6bbfb" />
        </linearGradient>
        <radialGradient id={`${id}-brillo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#e9d7fe" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e9d7fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-estrella`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6bbfb" />
        </linearGradient>
      </defs>
      <g transform="rotate(-40 75 75)">
        <circle cx="132" cy="75" r="36" fill={`url(#${id}-brillo)`} />
        <rect x="8" y="66" width="112" height="18" rx="9" fill={`url(#${id}-palo)`} />
        <rect x="16" y="69" width="92" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />
        <rect x="96" y="66" width="24" height="18" rx="9" fill={`url(#${id}-punta)`} />
        <path
          d="M132 53 C134 67 139 73 154 75 C139 77 134 83 132 97 C130 83 125 77 110 75 C125 73 130 67 132 53 Z"
          fill={`url(#${id}-estrella)`}
        />
      </g>
      <path
        d="M38 22 C39 28 41 30 47 31 C41 32 39 34 38 40 C37 34 35 32 29 31 C35 30 37 28 38 22 Z"
        fill="#ffffff"
      />
      <path
        d="M120 112 C121 116 122 117 126 118 C122 119 121 120 120 124 C119 120 118 119 114 118 C118 117 119 116 120 112 Z"
        fill="#e9d7fe"
      />
      <circle cx="84" cy="14" r="3" fill="#ffffff" />
    </svg>
  );
}

const boton =
  "inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-(--brand-dark) transition-colors outline-none hover:bg-[#f9f5ff] focus-visible:ring-3 focus-visible:ring-white/60";

// Hero de la Inicio, debajo del menú.
export function HeroVortice() {
  return (
    <div className="px-2">
      <section aria-labelledby="titular" className={s.seccion}>
        <div aria-hidden="true" className={s.fondo}>
          {BANDAS.map((b) => {
            const vars: Vars = {
              "--d": `${b.d}s`,
              "--dx": `${b.dx}px`,
              "--dy": `${b.dy}px`,
              "--w": b.w,
              "--h": b.h,
              "--c": b.c,
              "--t": `${b.t}deg`,
              "--b": `${b.b}px`,
            };
            return (
              <div key={b.c} className={s.orbita} style={vars}>
                <div className={s.contra}>
                  <div className={s.elipse} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Escritorio: la composición del diseño. */}
        <div aria-hidden="true" className={s.lienzo}>
          <Flotante pos={{ left: 392, top: 30 }} f={6}>
            <Ficha tam={92} radio={24} fondo="bg-white text-[#6941c6]" giro={-6} aviso={1}>
              <Landmark className="size-11" strokeWidth={1.8} />
            </Ficha>
            <div className="mt-3 -ml-[26px] inline-flex rounded-xl border border-white/15 bg-[#2c1c5f]/80 px-4 py-2.5 text-[17px] font-medium whitespace-nowrap text-white shadow-[0_12px_30px_rgba(44,28,95,0.3)]">
              ¿Notificación oficial?
            </div>
          </Flotante>

          <Flotante pos={{ left: 748, top: 92 }} f={7} r={1.5}>
            <Varita id="vd" tam={156} />
          </Flotante>

          <Flotante pos={{ right: 240, top: 106 }} f={6.5} r={3} className="flex flex-col items-end gap-2.5">
            <div className={burbuja}>
              Paquete retenido · paga 1,99 €
              <ExternalLink className="size-[18px] text-[#e9d7fe]" />
            </div>
            <Remitente icono={<Package className="size-4" />}>Paquetería</Remitente>
          </Flotante>

          <Flotante pos={{ left: 1250, top: 150 }} f={7.5} r={4.5}>
            <Ficha tam={88} radio={24} fondo="bg-(--brand) text-white" giro={8} aviso={2}>
              <Car className="size-[42px]" strokeWidth={1.8} />
            </Ficha>
          </Flotante>

          <Flotante pos={{ left: 124, top: 300 }} f={8} r={2.2}>
            <Ficha tam={72} radio={20} fondo="bg-[#2c1c5f] text-[#e9d7fe]" giro={-10}>
              <Mail className="size-[34px]" strokeWidth={1.8} />
            </Ficha>
          </Flotante>

          <Flotante pos={{ left: 1252, top: 448 }} f={6.8} r={5}>
            <Ficha tam={72} radio={20} fondo="border border-[#6941c6]/20 bg-[#f4ebff] text-[#6941c6]" giro={9}>
              <MessageCircle className="size-[34px]" strokeWidth={1.8} />
            </Ficha>
          </Flotante>

          <Flotante pos={{ left: 196, top: 596 }} f={7.2} r={0.8} className="flex flex-col items-end gap-2.5">
            <div className={burbuja}>
              Tienes una devolución pendiente
              <Link2 className="size-[18px] text-[#e9d7fe]" />
            </div>
            <Remitente icono={<ReceiptEuro className="size-4" />}>Impuestos</Remitente>
          </Flotante>

          <Flotante pos={{ left: 1004, top: 580 }} f={6.2} r={3.6} className="flex flex-col items-center gap-3">
            <div className={`relative flex size-[104px] items-center justify-center rounded-full bg-white text-(--brand) ${sombra}`}>
              <MessageSquareMore className="size-[46px]" strokeWidth={1.8} />
              <Aviso n={3} grande />
            </div>
            <div className="flex items-center gap-[7px] rounded-[14px] border border-white/15 bg-[#2c1c5f]/80 px-5 py-[13px]">
              <span className={`${s.punto} size-[9px] rounded-full bg-white`} />
              <span className={`${s.punto} size-[9px] rounded-full bg-white [animation-delay:0.2s]`} />
              <span className={`${s.punto} size-[9px] rounded-full bg-white [animation-delay:0.4s]`} />
            </div>
            <div className="rounded-full bg-white px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[#42307d]">
              Número desconocido está escribiendo…
            </div>
          </Flotante>
        </div>

        {/* Móvil y tablet: menos piezas, arriba y abajo del titular. */}
        <div aria-hidden="true" className={s.movil}>
          <Flotante pos={{ left: "7%", top: "5%" }} f={6}>
            <Ficha tam={60} radio={18} fondo="bg-white text-[#6941c6]" giro={-6} aviso={1}>
              <Landmark className="size-7" strokeWidth={1.8} />
            </Ficha>
          </Flotante>
          <Flotante pos={{ left: "calc(50% - 40px)", top: "2%" }} f={7} r={1.5}>
            <Varita id="vm" tam={80} />
          </Flotante>
          <Flotante pos={{ right: "8%", top: "8%" }} f={7.5} r={4.5}>
            <Ficha tam={56} radio={16} fondo="bg-(--brand) text-white" giro={8} aviso={2}>
              <Car className="size-7" strokeWidth={1.8} />
            </Ficha>
          </Flotante>
          <Flotante pos={{ left: "9%", bottom: "7%" }} f={8} r={2.2}>
            <Ficha tam={52} radio={16} fondo="bg-[#2c1c5f] text-[#e9d7fe]" giro={-10}>
              <Mail className="size-6" strokeWidth={1.8} />
            </Ficha>
          </Flotante>
          <Flotante pos={{ left: "calc(50% - 24px)", bottom: "4%" }} f={6.8} r={5}>
            <Ficha tam={48} radio={14} fondo="border border-[#6941c6]/20 bg-[#f4ebff] text-[#6941c6]" giro={9}>
              <MessageCircle className="size-6" strokeWidth={1.8} />
            </Ficha>
          </Flotante>
          <Flotante pos={{ right: "10%", bottom: "6%" }} f={6.2} r={3.6}>
            <div className={`relative flex size-16 items-center justify-center rounded-full bg-white text-(--brand) ${sombra}`}>
              <MessageSquareMore className="size-8" strokeWidth={1.8} />
              <Aviso n={3} />
            </div>
          </Flotante>
        </div>

        <div className="relative z-[2] flex h-full flex-col items-center justify-center gap-5 px-5 text-center text-white md:gap-6">
          <p className="max-w-[30ch] text-base leading-[1.35] font-medium text-white/90 md:text-xl">
            Pega el SMS, el correo o el enlace y te decimos si es la web oficial
          </p>
          <h1
            id="titular"
            className="max-w-[17ch] text-[clamp(32px,9vw,44px)] leading-[0.98] tracking-[-0.04em] md:text-[clamp(44px,5.6vw,80px)]"
          >
            Destapa el truco antes de pinchar.
          </h1>
          <a href="#comprobar" className={`${boton} mt-2`}>
            <WandSparkles aria-hidden="true" className="size-5" />
            Pasar la varita
          </a>
        </div>
      </section>
    </div>
  );
}
