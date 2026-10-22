// Reduce una imagen en el navegador y la pasa a JPEG en data URL, para no
// mandar varios MB al servidor con la captura. La usan el chat
// (ChatEstafas) y la pestaña de mensajes (VerificadorMensaje).

// Lo que aceptamos del usuario antes de reducirla.
export const MAX_IMAGEN = 20 * 1024 * 1024;

// Reduce la captura (lado largo de una captura de móvil: hasta 2560 px) y la
// pasa a JPEG para no mandar varios MB al servidor. Sigue siendo legible.
export async function reducirImagen(archivo: Blob): Promise<string> {
  if (!archivo.type.startsWith("image/") || archivo.size > MAX_IMAGEN)
    throw new Error("Adjunta una imagen PNG, JPG o WebP de menos de 20 MB.");
  const bitmap = await createImageBitmap(archivo).catch(() => {
    throw new Error("No he podido abrir esa imagen. Prueba con otra.");
  });
  const escala = Math.min(1, 1280 / bitmap.width, 2560 / bitmap.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  return lienzo.toDataURL("image/jpeg", 0.85);
}
