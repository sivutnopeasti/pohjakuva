import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { BrandiAsetukset, oletusAsetukset } from "@/lib/brandi";
import { pdfSivuKuvaksi } from "@/lib/pdf";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Tyypit ──────────────────────────────────────────────────────────────────

interface ClaudeAnalyysi {
  // Laatu
  laatu: {
    pisteet: number;           // 0–100
    ongelmat: string[];        // "blurry" | "low_contrast" | "noisy" | "low_resolution" | "skewed"
    tarvitseeParannuksen: boolean;
    parannusToimet: string[];  // "sharpen" | "normalize" | "median" | "deskew"
  };
  // Pohjakuva
  pohjakuva: {
    huoneet: string[];
    suositeltuFooterKorkeus: number;
    seiniaTunnistettu: boolean;
  };
}

// ─── Claude: laaduntarkistus + analyysi yhdessä kutsossa ─────────────────────

async function analysoidKuvanlaatu(
  base64: string,
  leveys: number,
  korkeus: number
): Promise<ClaudeAnalyysi> {
  const oletusVastaus: ClaudeAnalyysi = {
    laatu: {
      pisteet: 75,
      ongelmat: [],
      tarvitseeParannuksen: false,
      parannusToimet: [],
    },
    pohjakuva: {
      huoneet: [],
      suositeltuFooterKorkeus: Math.max(60, Math.round(korkeus * 0.07)),
      seiniaTunnistettu: true,
    },
  };

  if (!process.env.ANTHROPIC_API_KEY) return oletusVastaus;

  try {
    const vastaus = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: base64 },
            },
            {
              type: "text",
              text: `Analysoi tämä kiinteistön pohjakuva kahdelta kannalta ja vastaa VAIN JSON-muodossa:

{
  "laatu": {
    "pisteet": 85,
    "ongelmat": [],
    "tarvitseeParannuksen": false,
    "parannusToimet": []
  },
  "pohjakuva": {
    "huoneet": ["Olohuone", "Makuuhuone 1"],
    "suositeltuFooterKorkeus": 80,
    "seiniaTunnistettu": true
  }
}

Ohjeet:
- laatu.pisteet: 0-100 (alle 65 = tarvitsee parannuksen)
- laatu.ongelmat: lista ongelmista kuten "blurry", "low_contrast", "noisy", "low_resolution", "skewed"
- laatu.parannusToimet: lista toimenpiteistä: "sharpen" (sumuinen/epäterävä), "normalize" (heikko kontrasti), "median" (kohinainen/rasterijälki), "deskew" (vino skannaus)
- pohjakuva.suositeltuFooterKorkeus: 60-100px kuvan korkeuteen (${korkeus}px) suhteutettuna
- pohjakuva.seiniaTunnistettu: true jos kuvassa on selkeät tummat seinälinjat`,
            },
          ],
        },
      ],
    });

    const teksti =
      vastaus.content[0].type === "text" ? vastaus.content[0].text : "";
    const jsonMatch = teksti.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as ClaudeAnalyysi;
  } catch (err) {
    console.error("Claude-analyysi epäonnistui:", err);
  }

  return oletusVastaus;
}

// ─── Sharp: kuvanlaadun parannus ──────────────────────────────────────────────

async function parannaKuvanlaatu(
  buffer: Buffer,
  toimet: string[]
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Järjestys: median ensin (poistaa kohina), sitten terävöinti, sitten kontrasti
  if (toimet.includes("median")) {
    pipeline = pipeline.median(3);
  }

  if (toimet.includes("sharpen")) {
    // Voimakas terävöinti pohjakuville: korostaa viivoja ja tekstiä
    pipeline = pipeline.sharpen({ sigma: 1.8, m1: 0.5, m2: 3.0, x1: 2, y2: 15, y3: 15 });
  }

  if (toimet.includes("normalize")) {
    pipeline = pipeline.normalize();
  }

  // Clahe parantaa paikallista kontrastia (hyvä huonolaatuisille skannauksille)
  if (toimet.includes("normalize") || toimet.includes("low_contrast")) {
    pipeline = pipeline.clahe({ width: 8, height: 8, maxSlope: 4 });
  }

  return pipeline.png().toBuffer();
}

// ─── Sharp: seinien värinvaihto brändiväriksi ─────────────────────────────────

async function vaihdaseinatVari(
  buffer: Buffer,
  seinaVari: string,
  kynnys = 110   // pikselit joiden luminanssi < kynnys = seinä
): Promise<Buffer> {
  const { r: sr, g: sg, b: sb } = hex2rgb(seinaVari);

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const tulos = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];

    // Luminanssi (ihmissilmän painotus)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum < kynnys) {
      // Tumma pikseli = seinä → brändin ensisijainen väri
      // Säilytetään alkuperäinen tummuus suhteessa (antaa syvyyttä)
      const kerroin = lum / kynnys;
      tulos[o]     = Math.round(sr * kerroin);
      tulos[o + 1] = Math.round(sg * kerroin);
      tulos[o + 2] = Math.round(sb * kerroin);
      // alpha pysyy ennallaan
    }
  }

  return sharp(tulos, { raw: { width, height, channels } }).png().toBuffer();
}

// ─── SVG-apufunktiot ──────────────────────────────────────────────────────────

function hex2rgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

function luoFooterSVG(leveys: number, korkeus: number, brandi: BrandiAsetukset): string {
  const yhteystiedot = [brandi.puhelinnumero, brandi.sahkoposti, brandi.verkkosivusto]
    .filter(Boolean).join("  |  ");
  return `<svg width="${leveys}" height="${korkeus}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${leveys}" height="${korkeus}" fill="${brandi.ensisijainenVari}"/>
    <rect x="0" y="0" width="6" height="${korkeus}" fill="${brandi.toissijaineVari}"/>
    <text x="20" y="${korkeus * 0.42}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.32)}px" font-weight="bold" fill="${brandi.tekstiVari}">${brandi.yritysNimi || "Kiinteistövälitys"}</text>
    ${brandi.slogan ? `<text x="20" y="${korkeus * 0.72}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.2)}px" fill="${brandi.tekstiVari}" opacity="0.8">${brandi.slogan}</text>` : ""}
    ${yhteystiedot ? `<text x="${leveys - 20}" y="${korkeus * 0.55}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.18)}px" fill="${brandi.tekstiVari}" opacity="0.85" text-anchor="end">${yhteystiedot}</text>` : ""}
  </svg>`;
}

function luoReunusSVG(leveys: number, korkeus: number, vari: string): string {
  const p = Math.max(4, Math.round(Math.min(leveys, korkeus) * 0.006));
  return `<svg width="${leveys}" height="${korkeus}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${p / 2}" y="${p / 2}" width="${leveys - p}" height="${korkeus - p}"
      fill="none" stroke="${vari}" stroke-width="${p}"/>
  </svg>`;
}

// ─── Pääreitti ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const kuvatiedosto = formData.get("kuva") as File | null;
    const brandiJSON   = formData.get("brandi") as string | null;

    if (!kuvatiedosto) {
      return NextResponse.json({ virhe: "Kuvaa ei löydy" }, { status: 400 });
    }

    const brandi: BrandiAsetukset = brandiJSON
      ? { ...oletusAsetukset, ...JSON.parse(brandiJSON) }
      : oletusAsetukset;

    // ── Vaihe 1: PDF → PNG ───────────────────────────────────────────────────
    let kuvaBuffer = Buffer.from(await kuvatiedosto.arrayBuffer()) as Buffer<ArrayBuffer>;

    if (kuvatiedosto.type === "application/pdf") {
      try {
        const tulos = await pdfSivuKuvaksi(kuvaBuffer, 1);
        kuvaBuffer = tulos.buffer;
      } catch {
        return NextResponse.json(
          { virhe: "PDF-muunnos epäonnistui. Kokeile PNG-muotoa." },
          { status: 400 }
        );
      }
    }

    // Normalisoi PNG:ksi
    let tyoBuffer: Buffer = await sharp(kuvaBuffer).png().toBuffer();
    const metadata = await sharp(tyoBuffer).metadata();
    const leveys  = metadata.width  ?? 1200;
    const korkeus = metadata.height ?? 900;

    // ── Vaihe 2: Claude – laaduntarkistus + analyysi ─────────────────────────
    const base64   = tyoBuffer.toString("base64");
    const analyysi = await analysoidKuvanlaatu(base64, leveys, korkeus);

    // ── Vaihe 3: Kuvanlaadun parannus (jos tarpeen) ──────────────────────────
    if (analyysi.laatu.tarvitseeParannuksen && analyysi.laatu.parannusToimet.length > 0) {
      tyoBuffer = await parannaKuvanlaatu(tyoBuffer, analyysi.laatu.parannusToimet);
    }

    // ── Vaihe 4: Seinien värinvaihto brändiväriksi ───────────────────────────
    tyoBuffer = await vaihdaseinatVari(tyoBuffer, brandi.ensisijainenVari);

    // ── Vaihe 5: Footer + reunus + logo ──────────────────────────────────────
    const footerKorkeus = Math.min(120, Math.max(60, analyysi.pohjakuva.suositeltuFooterKorkeus));
    const uusiKorkeus   = korkeus + footerKorkeus;

    const composites: sharp.OverlayOptions[] = [
      { input: Buffer.from(luoFooterSVG(leveys, footerKorkeus, brandi)), top: korkeus, left: 0 },
      { input: Buffer.from(luoReunusSVG(leveys, uusiKorkeus, brandi.toissijaineVari)), top: 0, left: 0 },
    ];

    // Logo footeriin
    if (brandi.logo) {
      try {
        const logoBase64 = brandi.logo.split(",")[1];
        const logoBuffer = Buffer.from(logoBase64, "base64");
        const logoMaxH   = Math.round(footerKorkeus * 0.75);
        const logoMaxW   = Math.round(leveys * 0.15);

        const logoResized = await sharp(logoBuffer)
          .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
          .png().toBuffer();

        const logoMeta = await sharp(logoResized).metadata();
        const lw = logoMeta.width  ?? logoMaxW;
        const lh = logoMeta.height ?? logoMaxH;

        composites.push({
          input: logoResized,
          top:  korkeus + Math.round((footerKorkeus - lh) / 2),
          left: leveys - lw - 16,
        });
      } catch (logoErr) {
        console.error("Logo-käsittely epäonnistui:", logoErr);
      }
    }

    // ── Vaihe 6: Kokoa lopullinen kuva ───────────────────────────────────────
    const lopullinen = await sharp({
      create: { width: leveys, height: uusiKorkeus, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: tyoBuffer, top: 0, left: 0 }, ...composites])
      .png()
      .toBuffer();

    return NextResponse.json({
      kuva: `data:image/png;base64,${lopullinen.toString("base64")}`,
      // Palautetaan myös tietoja käyttöliittymälle
      laatu: analyysi.laatu,
    });
  } catch (err) {
    console.error("Brändäysvirhe:", err);
    return NextResponse.json(
      { virhe: "Kuvan käsittely epäonnistui. Tarkista asetukset ja yritä uudelleen." },
      { status: 500 }
    );
  }
}
