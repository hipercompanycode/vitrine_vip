import sharp from "sharp";

// dHash (difference hash): reduz a imagem pra 9x8 tons de cinza e compara cada
// pixel com o vizinho da direita -> 64 bits (hex de 16 chars). Fotos iguais/
// quase-iguais têm hash igual ou muito próximo; robusto a recompressão/resize.
export async function dHash(buf: Buffer): Promise<string> {
  const { data } = await sharp(buf)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits += left > right ? "1" : "0";
    }
  }
  // 64 bits -> 16 chars hex (4 bits por char), sem BigInt.
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

// Distância de Hamming entre dois hashes hex (nº de bits diferentes, 0..64),
// contada nibble a nibble pra não depender de BigInt.
// 0 = imagem idêntica; <= ~8 = praticamente a mesma foto.
export function hamming(a?: string | null, b?: string | null): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = parseInt(a[i], 16);
    const xb = parseInt(b[i], 16);
    if (Number.isNaN(xa) || Number.isNaN(xb)) return 64;
    let x = xa ^ xb;
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export const DUP_THRESHOLD = 10; // <= isso = tratamos como foto duplicada (sinal p/ o admin)
