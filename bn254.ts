const bn = require('@noble/curves/bn');
const { htfBasicOpts} = require('@noble/curves/abstract/weierstrass');
const htf = require("@noble/curves/abstract/hash-to-curve");

function hashToCurve(msg: Uint8Array, options?: htfBasicOpts) {
      const u = hash_to_field(msg, 2, { ...def, DST: def.DST, ...options } as Opts);
      const u0 = Point.fromAffine(mapToCurve(u[0]));
      const u1 = Point.fromAffine(mapToCurve(u[1]));
      const P = u0.add(u1).clearCofactor();
      P.assertValidity();
      return P;
}

type withPairingPrecomputes = { _PPRECOMPUTES: [Fp2, Fp2, Fp2][] | undefined };
function pairingPrecomputes(point: G2): [Fp2, Fp2, Fp2][] {
    const p = point as G2 & withPairingPrecomputes;
    if (p._PPRECOMPUTES) return p._PPRECOMPUTES;
    p._PPRECOMPUTES = calcPairingPrecomputes(point.toAffine());
    return p._PPRECOMPUTES;
}

function pairing(Q: G1, P: G2, withFinalExponent: boolean = true): Fp12 {
    if (Q.equals(G1.ProjectivePoint.ZERO) || P.equals(G2.ProjectivePoint.ZERO))
      throw new Error('pairing is not available for ZERO point');
    Q.assertValidity();
    P.assertValidity();
    // Performance: 9ms for millerLoop and ~14ms for exp.
    const Qa = Q.toAffine();
    const looped = millerLoop(pairingPrecomputes(P), [Qa.x, Qa.y]);
    return withFinalExponent ? Fp12.finalExponentiate(looped) : looped;
}

export function hexToBytes(hex0x: string): Uint8Array {
  if (typeof hex0x !== 'string') {
      throw new TypeError('hexToBytes: expected string, got ' + typeof hex0x);
  }
  let hex = hex0x.slice(2, hex0x.length);
  if (hex0x.length % 2) throw new Error('hexToBytes: received invalid unpadded hex');

  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
      const j = i * 2;
      const hexByte = hex.slice(j, j + 2);
      if (hexByte.length !== 2) throw new Error('Invalid byte sequence');
      const byte = Number.parseInt(hexByte, 16);
      if (Number.isNaN(byte) || byte < 0) throw new Error('Invalid byte sequence');
      array[i] = byte;
  }
  console.log(array)
  return array;
}

function frToLimbs(x: bigint) {
  var acc = x;
  //console.log(acc.toString());
  var r:Array<string> = [];
  for (var i=0;i<8;i++) {
    const b = BigInt("0x40000000000000");
    const l = acc / b;
    const rem = acc % b;
    r.push("PUBKEYS=\"$PUBKEYS " + rem.toString() + ":i64\"");
    acc = l;
  }
  return r;
}

function pubkeyToG1(pubkey0x: string) {
    const pubKey = hexToBytes(pubkey0x);
    const g1 = bn.bn254.ProjectivePoint.fromHex(pubKey);
    return g1;
}

const { hashToCurve, encodeToCurve } = htf.createHasher(bn.bn254.ProjectivePoint, (scalars) => weierstrass.mapToCurveSimpleSWU(scalars[0]), {
    DST: 'edwards25519_XMD:SHA-512_ELL2_RO_',
    encodeDST: 'edwards25519_XMD:SHA-512_ELL2_NU_',
    p: Fp.ORDER,
    m: 1,
    k: 128,
    expand: 'xmd',
    hash: sha512_1.sha512,
});

//?
async function msgToG2(msg0x: string) {
  const msg = hexToBytes(msg0x);
  const g2 = await bls.PointG2.hashToCurve(msg);
}

//?
function fp2ToLimbs(fp2: any) {
  for (var limb of frToLimbs(fp2.c0.value)) {
     console.log(limb.toString()); 
  }
  for (var limb of frToLimbs(fp2.c1.value)) {
     console.log(limb.toString()); 
  }
}

function g2ToLimbs(g2: any) {
  const x = g2.toAffine().x;
  const y = g2.toAffine().y;
  fp2ToLimbs(x);
  fp2ToLimbs(y);
}

function g1ToLimbs(g1: any) {
    const x:bigint = g1.toAffine().x;
    const y:bigint = g1.toAffine().y;
    for (var limb of frToLimbs(x)) {
       console.log(limb.toString()); 
    }
    for (var limb of frToLimbs(y)) {
       console.log(limb.toString()); 
    }
}

//?
function gtToLimbs(gt: any) {
    fp2ToLimbs(gt.c0.c0);
    fp2ToLimbs(gt.c0.c1);
    fp2ToLimbs(gt.c0.c2);
    fp2ToLimbs(gt.c1.c0);
    fp2ToLimbs(gt.c1.c1);
    fp2ToLimbs(gt.c1.c2);
}

function setPublicInput(nbpubkey: number) {
    console.log(`NB_PUBKEY=${nbpubkey}`); 
}

const key = [
    "0x02072df5415007ac47bc6e208c7ce8ee7210aec568ebfbc10557ac2023c44cad36",
    "0x03137051f8462b938e164b08fe48ff59ba3c2b25e2df5e76405414f74557c84ac5"
];

async function main() {
    let g1s = [];
    for (var k of key) {
      const g1 = pubkeyToG1(k);
      g1ToLimbs(g1);
      g1s.push(g1);
    }
    let acc = g1s.pop();
    for (var g of g1s) {
      console.log(g.toAffine().x);
      acc = acc.add(g);
    }

    setPublicInput(key.length);

    console.log(`# G2`); 
    let g2 = await msgToG2("0x1234");
    g2ToLimbs(g2);

    console.log(`# Pairing result`);
    //?
    let gt = await bls.pairing(acc, g2);
    gtToLimbs(gt);

    /*
    console.log("g1-x ", acc.toAffine()[0]);
    console.log("g1-y ", acc.toAffine()[1]);
    console.log("g2-x ", g2.toAffine()[0]);
    console.log("g2-y ", g2.toAffine()[1]);
    console.log(gt.c0);
    console.log(gt.c1);
    */
}

main().then(()=>{process.exit();});
