export interface BrandiAsetukset {
  yritysNimi: string;
  slogan: string;
  ensisijainenVari: string;
  toissijaineVari: string;
  tekstiVari: string;
  logo: string | null; // base64
  logoTiedostoNimi: string | null;
  footerTeksti: string;
  puhelinnumero: string;
  sahkoposti: string;
  verkkosivusto: string;
}

export const oletusAsetukset: BrandiAsetukset = {
  yritysNimi: "",
  slogan: "",
  ensisijainenVari: "#1e3a5f",
  toissijaineVari: "#c9a84c",
  tekstiVari: "#ffffff",
  logo: null,
  logoTiedostoNimi: null,
  footerTeksti: "",
  puhelinnumero: "",
  sahkoposti: "",
  verkkosivusto: "",
};

export function haeBrandi(): BrandiAsetukset {
  if (typeof window === "undefined") return oletusAsetukset;
  const tallennettu = localStorage.getItem("pohjakuva_brandi");
  if (!tallennettu) return oletusAsetukset;
  try {
    return JSON.parse(tallennettu);
  } catch {
    return oletusAsetukset;
  }
}

export function tallennaBrandi(asetukset: BrandiAsetukset): void {
  localStorage.setItem("pohjakuva_brandi", JSON.stringify(asetukset));
}
