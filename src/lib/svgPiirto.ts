import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Väriapufunktiot ──────────────────────────────────────────────────────────

function hex2rgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

/** Tummentaa väriä kertoimella 0–1 (0 = musta, 1 = alkuperäinen) */
function tummennaVari(hex: string, kerroin: number): string {
  const { r, g, b } = hex2rgb(hex);
  const t = (v: number) => Math.round(v * kerroin).toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`;
}

/** Palauttaa tarpeeksi tumman version brändivärille seinäkäyttöön */
export function seinaVari(brandiVari: string): string {
  const { r, g, b } = hex2rgb(brandiVari);
  const luminanssi = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Jos väri on liian vaalea (luminanssi > 0.35), tummennetaan 40%:iin
  return luminanssi > 0.35 ? tummennaVari(brandiVari, 0.35) : brandiVari;
}

// ─── Claude SVG-generointi ────────────────────────────────────────────────────

const SVG_OHJE = (leveys: number, korkeus: number, wallColor: string) => `
You are an expert architectural floor plan renderer. Analyze this floor plan image and generate clean, professional SVG code that redraws it in a standardized architectural style.

OUTPUT SPECIFICATIONS:
- SVG element: <svg width="${leveys}" height="${korkeus}" viewBox="0 0 ${leveys} ${korkeus}" xmlns="http://www.w3.org/2000/svg">
- White background: <rect width="${leveys}" height="${korkeus}" fill="white"/>
- Margin: 40px on all sides (floor plan area: 40,40 to ${leveys - 40},${korkeus - 40})

WALL STYLE:
- Wall color: stroke="${wallColor}" fill="none" stroke-linejoin="miter" stroke-linecap="square"
- Exterior walls: stroke-width="10"
- Interior partition walls: stroke-width="7"
- Draw walls as <polyline> or <line> elements, NOT as filled rectangles

DOOR SYMBOLS (standard architectural):
- Show opening in wall (gap)
- Quarter-circle arc showing door swing: <path d="M x1,y1 A r,r 0 0,1 x2,y2" fill="none" stroke="${wallColor}" stroke-width="1.5"/>
- Thin straight line from hinge point to door edge

WINDOW SYMBOLS:
- Gap in wall
- Three thin parallel lines across the opening: stroke="${wallColor}" stroke-width="1" opacity="0.7"

ROOM LABELS:
- <text font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#444444" text-anchor="middle" dominant-baseline="middle">
- Finnish uppercase abbreviations: OH (olohuone), MH (makuuhuone), K (keittiö), KPH (kylpyhuone), VH (vaatehuone), ET (eteinen/eteistila), WC, S (sauna), KHH (kodinhoitohuone)
- Place label at room center

FURNITURE SYMBOLS (simple outlines, stroke="${wallColor}" stroke-width="1" fill="white" opacity="0.85"):
- Toilet: outer oval ~45×60px + inner small oval at top ~30×15px
- Sink/washbasin: rectangle ~50×40px with small oval inside
- Bathtub: rectangle ~70×140px with oval inside
- Kitchen sink: rectangle ~50×80px with oval inside
- Stovetop/cooker: rectangle with 4 small circles (~8px radius) for burners
- Refrigerator: rectangle with handle line
- Stairs: rectangle with diagonal parallel lines (stroke-dasharray: none, just 5-6 parallel lines)
- Radiators: thin rectangle along wall

BALCONY/PARVEKE:
- Dashed outline: stroke-dasharray="8,4" stroke="${wallColor}" stroke-width="3" fill="none"

DISCLAIMER TEXT:
- At bottom of floor plan area (y = ${korkeus - 55}), centered:
  <text x="${leveys / 2}" y="${korkeus - 55}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#888888" text-anchor="middle" letter-spacing="1">SUUNTAA ANTAVA, EI MITTAKAAVASSA</text>

IMPORTANT RULES:
- Faithfully reproduce the layout, proportions, and all rooms from the input image
- Do NOT add compass rose, north arrow, dimensions, or scale
- Do NOT include watermarks, logos, copyright text, or agent information
- Do NOT use <image> elements
- All coordinates must be numbers (no units like px or mm)
- Return ONLY valid SVG code starting with <svg and ending with </svg>
- No markdown code fences, no explanations, no other text
`;

// ─── Pääfunktio ───────────────────────────────────────────────────────────────

export async function piirraSVGlla(
  base64: string,
  wallColor: string,
  leveys: number,
  korkeus: number
): Promise<Buffer | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const vastaus = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8000,
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
              text: SVG_OHJE(leveys, korkeus, wallColor),
            },
          ],
        },
      ],
    });

    const teksti =
      vastaus.content[0].type === "text" ? vastaus.content[0].text : "";

    // Pura SVG tekstistä (joskus Claude lisää markdown-koodieston)
    const svgMatch =
      teksti.match(/```svg\s*([\s\S]*?)```/) ??
      teksti.match(/(<svg[\s\S]*?<\/svg>)/);
    if (!svgMatch) {
      console.error("Claude ei palauttanut SVG:tä:", teksti.substring(0, 200));
      return null;
    }

    const svgKoodi = (svgMatch[1] ?? svgMatch[0]).trim();

    // Validointi
    if (!svgKoodi.startsWith("<svg") || !svgKoodi.includes("</svg>")) {
      console.error("SVG ei ole validi");
      return null;
    }

    // Sharp renderöi SVG → PNG
    return await sharp(Buffer.from(svgKoodi))
      .png()
      .toBuffer();
  } catch (err) {
    console.error("SVG-piirto epäonnistui:", err);
    return null;
  }
}
