import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { BrandiAsetukset, oletusAsetukset } from "@/lib/brandi";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PohjakuvaAnalyysi {
  pohjakuvanRajat: {
    x: number;
    y: number;
    leveys: number;
    korkeus: number;
  } | null;
  huoneet: string[];
  onTekstia: boolean;
  suositeltuFooterKorkeus: number;
}

async function analysoidPohjakuva(
  base64Kuva: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
  kuvanLeveys: number,
  kuvanKorkeus: number
): Promise<PohjakuvaAnalyysi> {
  try {
    const vastaus = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Kuva,
              },
            },
            {
              type: "text",
              text: `Analysoi tämä kiinteistön pohjakuva ja vastaa VAIN JSON-muodossa ilman muuta tekstiä:
{
  "pohjakuvanRajat": {"x": 0, "y": 0, "leveys": ${kuvanLeveys}, "korkeus": ${kuvanKorkeus}},
  "huoneet": ["lista huoneista jos tunnistettavissa"],
  "onTekstia": true,
  "suositeltuFooterKorkeus": 80
}

Suositeltu footer-korkeus: 60-100px riippuen kuvan koosta (${kuvanKorkeus}px korkea).`,
            },
          ],
        },
      ],
    });

    const tekstiVastaus =
      vastaus.content[0].type === "text" ? vastaus.content[0].text : "";
    const jsonMatch = tekstiVastaus.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PohjakuvaAnalyysi;
    }
  } catch (err) {
    console.error("Claude-analyysi epäonnistui:", err);
  }

  // Oletusarvo jos analyysi epäonnistuu
  return {
    pohjakuvanRajat: null,
    huoneet: [],
    onTekstia: true,
    suositeltuFooterKorkeus: Math.max(60, Math.round(kuvanKorkeus * 0.07)),
  };
}

function hex2rgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function luoFooterSVG(
  leveys: number,
  korkeus: number,
  brandi: BrandiAsetukset
): string {
  const taustaVari = brandi.ensisijainenVari;
  const korostusVari = brandi.toissijaineVari;
  const tekstiVari = brandi.tekstiVari;
  const nimi = brandi.yritysNimi || "Kiinteistövälitys";
  const slogan = brandi.slogan;
  const puhelin = brandi.puhelinnumero;
  const sahkoposti = brandi.sahkoposti;
  const verkko = brandi.verkkosivusto;

  const yhteystiedot = [puhelin, sahkoposti, verkko].filter(Boolean).join("  |  ");

  return `<svg width="${leveys}" height="${korkeus}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${leveys}" height="${korkeus}" fill="${taustaVari}"/>
    <rect x="0" y="0" width="6" height="${korkeus}" fill="${korostusVari}"/>
    <text x="20" y="${korkeus * 0.42}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.32)}px" font-weight="bold" fill="${tekstiVari}">${nimi}</text>
    ${slogan ? `<text x="20" y="${korkeus * 0.72}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.2)}px" fill="${tekstiVari}" opacity="0.8">${slogan}</text>` : ""}
    ${yhteystiedot ? `<text x="${leveys - 20}" y="${korkeus * 0.55}" font-family="Arial, sans-serif" font-size="${Math.round(korkeus * 0.18)}px" fill="${tekstiVari}" opacity="0.85" text-anchor="end">${yhteystiedot}</text>` : ""}
  </svg>`;
}

function luoReunusSVG(leveys: number, korkeus: number, vari: string): string {
  const paksuus = Math.max(4, Math.round(Math.min(leveys, korkeus) * 0.006));
  return `<svg width="${leveys}" height="${korkeus}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${paksuus / 2}" y="${paksuus / 2}" width="${leveys - paksuus}" height="${korkeus - paksuus}" 
      fill="none" stroke="${vari}" stroke-width="${paksuus}" rx="0"/>
  </svg>`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const kuvatiedosto = formData.get("kuva") as File | null;
    const brandiJSON = formData.get("brandi") as string | null;

    if (!kuvatiedosto) {
      return NextResponse.json({ virhe: "Kuvaa ei löydy" }, { status: 400 });
    }

    const brandi: BrandiAsetukset = brandiJSON
      ? { ...oletusAsetukset, ...JSON.parse(brandiJSON) }
      : oletusAsetukset;

    const kuvaBuffer = Buffer.from(await kuvatiedosto.arrayBuffer());
    const mediaType = kuvatiedosto.type as "image/png" | "image/jpeg" | "image/webp";

    // Kuvan metadata
    const metadata = await sharp(kuvaBuffer).metadata();
    const leveys = metadata.width ?? 1200;
    const korkeus = metadata.height ?? 900;

    // Normalisoi PNG:ksi
    const normalisoituBuffer = await sharp(kuvaBuffer)
      .png()
      .toBuffer();

    // Claude-analyysi (jos API-avain asetettu)
    let analyysi: PohjakuvaAnalyysi = {
      pohjakuvanRajat: null,
      huoneet: [],
      onTekstia: true,
      suositeltuFooterKorkeus: Math.max(60, Math.round(korkeus * 0.07)),
    };

    if (process.env.ANTHROPIC_API_KEY) {
      const base64 = normalisoituBuffer.toString("base64");
      analyysi = await analysoidPohjakuva(base64, "image/png", leveys, korkeus);
    }

    const footerKorkeus = Math.min(
      120,
      Math.max(60, analyysi.suositeltuFooterKorkeus)
    );
    const uusiKorkeus = korkeus + footerKorkeus;

    // Luo footer SVG
    const footerSVG = luoFooterSVG(leveys, footerKorkeus, brandi);
    const footerBuffer = Buffer.from(footerSVG);

    // Luo reunus SVG (koko kuvaan footerin kanssa)
    const reunusSVG = luoReunusSVG(leveys, uusiKorkeus, brandi.toissijaineVari);
    const reunusBuffer = Buffer.from(reunusSVG);

    // Kokoa kuva: alkuperäinen + footer + reunus
    const composites: sharp.OverlayOptions[] = [
      {
        input: footerBuffer,
        top: korkeus,
        left: 0,
      },
      {
        input: reunusBuffer,
        top: 0,
        left: 0,
      },
    ];

    // Lisää logo jos olemassa
    if (brandi.logo) {
      try {
        const logoBase64 = brandi.logo.split(",")[1];
        const logoBuffer = Buffer.from(logoBase64, "base64");
        const logoMetadata = await sharp(logoBuffer).metadata();
        const logoMaxKorkeus = Math.round(footerKorkeus * 0.75);
        const logoMaxLeveys = Math.round(leveys * 0.15);

        const logoKuva = await sharp(logoBuffer)
          .resize(logoMaxLeveys, logoMaxKorkeus, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .png()
          .toBuffer();

        const logoMeta = await sharp(logoKuva).metadata();
        const logoLeveys = logoMeta.width ?? logoMaxLeveys;
        const logoKorkeus2 = logoMeta.height ?? logoMaxKorkeus;
        const logoVasen = leveys - logoLeveys - 16;
        const logoYlos = korkeus + Math.round((footerKorkeus - logoKorkeus2) / 2);

        composites.push({
          input: logoKuva,
          top: logoYlos,
          left: logoVasen,
        });
      } catch (logoErr) {
        console.error("Logo-käsittely epäonnistui:", logoErr);
      }
    }

    // Rakenna lopullinen kuva
    const lopullinenBuffer = await sharp({
      create: {
        width: leveys,
        height: uusiKorkeus,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        { input: normalisoituBuffer, top: 0, left: 0 },
        ...composites,
      ])
      .png()
      .toBuffer();

    const base64Tulos = `data:image/png;base64,${lopullinenBuffer.toString("base64")}`;

    return NextResponse.json({ kuva: base64Tulos });
  } catch (err) {
    console.error("Brändäysvirhe:", err);
    return NextResponse.json(
      { virhe: "Kuvan käsittely epäonnistui. Tarkista asetukset ja yritä uudelleen." },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
