"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Zap, AlertCircle, Loader2, FileText } from "lucide-react";

type Vaihe = "lataus" | "kasittely" | "valmis" | "virhe";

interface LaaturaporttI {
  pisteet: number;
  ongelmat: string[];
  tarvitseeParannuksen: boolean;
  parannusToimet: string[];
}

export default function BrandaysSivu() {
  const [vaihe, setVaihe] = useState<Vaihe>("lataus");
  const [tiedosto, setTiedosto] = useState<File | null>(null);
  const [esikatselu, setEsikatselu] = useState<string | null>(null);
  const [tulos, setTulos] = useState<string | null>(null);
  const [laatu, setLaatu] = useState<LaaturaporttI | null>(null);
  const [virheViesti, setVirheViesti] = useState<string>("");
  const [raahaus, setRaahaus] = useState(false);
  const [edistyminen, setEdistyminen] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const kasitteleTiedosto = useCallback((file: File) => {
    const sallitut = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!sallitut.includes(file.type)) {
      setVirheViesti("Tuetut formaatit: PNG, JPG, WEBP, PDF");
      setVaihe("virhe");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setVirheViesti("Tiedosto on liian suuri (max 30 Mt)");
      setVaihe("virhe");
      return;
    }
    setTiedosto(file);
    if (file.type === "application/pdf") {
      // PDF:lle näytetään ikonin sijaan placeholder
      setEsikatselu("pdf");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setEsikatselu(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    setVaihe("lataus");
  }, []);

  function kasitteleDroppi(e: React.DragEvent) {
    e.preventDefault();
    setRaahaus(false);
    const file = e.dataTransfer.files[0];
    if (file) kasitteleTiedosto(file);
  }

  async function kaynnistaEdistyminen() {
    const vaiheet = [
      "Tarkistetaan kuvanlaatu tekoälyllä...",
      "Parannetaan kuvanlaatua tarvittaessa...",
      "Analysoidaan huoneet, seinät ja oviaukot...",
      "Piirretään pohjakuva uudelleen (tämä vie hetken)...",
      "Lisätään ovikaaret, ikkunat ja kalusteet...",
      "Lisätään footer, logo ja reunus...",
      "Viimeistellään kuva...",
    ];
    for (const v of vaiheet) {
      setEdistyminen(v);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  async function kaynnistaLopullinen(base64: string) {
    if (!tiedosto) return;
    setVaihe("kasittely");
    setVirheViesti("");

    kaynnistaEdistyminen();

    try {
      const formData = new FormData();
      formData.append("kuva", tiedosto);

      // Haetaan brändiasetuket localStoragesta ja lisätään mukaan
      const brandi = localStorage.getItem("pohjakuva_brandi") ?? "{}";
      formData.append("brandi", brandi);

      const vastaus = await fetch("/api/brandays", {
        method: "POST",
        body: formData,
      });

      if (!vastaus.ok) {
        const data = await vastaus.json();
        throw new Error(data.virhe ?? "Tuntematon virhe");
      }

      const data = await vastaus.json();
      setTulos(data.kuva);
      if (data.laatu) setLaatu(data.laatu);
      setVaihe("valmis");
    } catch (err) {
      setVirheViesti(err instanceof Error ? err.message : "Virhe käsittelyssä");
      setVaihe("virhe");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Pohjakuva</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Brändää pohjakuva</h1>
          <p className="text-gray-600 mt-1">
            Lataa taloyhtiön pohjakuva – tekoäly lisää brändisi automaattisesti.
          </p>
        </div>

        {/* Latausvaihe */}
        {(vaihe === "lataus" || vaihe === "virhe") && (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setRaahaus(true); }}
              onDragLeave={() => setRaahaus(false)}
              onDrop={kasitteleDroppi}
              onClick={() => !tiedosto && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl transition-colors cursor-pointer
                ${raahaus ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-white"}
                ${tiedosto ? "p-4" : "p-12"}`}
            >
              {tiedosto && esikatselu ? (
                <div className="flex items-center gap-4">
                  {esikatselu === "pdf" ? (
                    <div className="w-24 h-24 flex flex-col items-center justify-center rounded-lg bg-red-50 border border-red-200">
                      <FileText className="w-8 h-8 text-red-500 mb-1" />
                      <span className="text-xs text-red-600 font-medium">PDF</span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={esikatselu}
                      alt="Esikatselu"
                      className="w-24 h-24 object-contain rounded-lg bg-gray-100 p-1"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tiedosto.name}</p>
                    <p className="text-sm text-gray-500">
                      {(tiedosto.size / 1024).toFixed(0)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTiedosto(null);
                        setEsikatselu(null);
                        setVaihe("lataus");
                      }}
                      className="text-sm text-red-600 hover:text-red-700 mt-1"
                    >
                      Vaihda tiedosto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-700 font-medium">
                    Vedä pohjakuva tähän tai klikkaa
                  </p>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG, WEBP, PDF – max 30 Mt</p>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) kasitteleTiedosto(f);
              }}
            />

            {/* PDF-huomio */}
            {tiedosto?.type === "application/pdf" && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>PDF muunnetaan automaattisesti – käytetään ensimmäistä sivua pohjakuvana.</span>
              </div>
            )}

            {/* Virheviesti */}
            {vaihe === "virhe" && virheViesti && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{virheViesti}</p>
              </div>
            )}

            {/* Käynnistä */}
            {tiedosto && (
              <button
                onClick={() => kaynnistaLopullinen(esikatselu!)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                <Zap className="w-5 h-5" />
                Brändää pohjakuva
              </button>
            )}
          </div>
        )}

        {/* Käsittelyvaihe */}
        {vaihe === "kasittely" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Käsitellään...
            </h2>
            <p className="text-gray-600 text-sm">{edistyminen}</p>
          </div>
        )}

        {/* Valmis */}
        {vaihe === "valmis" && tulos && (
          <div className="space-y-6">
            {/* Laaturaportti */}
            {laatu && (
              <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 text-sm
                ${laatu.tarvitseeParannuksen
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-green-50 border-green-200 text-green-800"}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {laatu.tarvitseeParannuksen ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="font-semibold">
                    Kuvanlaatu: {laatu.pisteet}/100
                    {laatu.tarvitseeParannuksen ? " – parannettiin automaattisesti" : " – hyvä"}
                  </span>
                  {laatu.parannusToimet.length > 0 && (
                    <p className="mt-0.5 opacity-80">
                      Toimenpiteet: {laatu.parannusToimet.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium text-sm">
                  Brändäys valmis!
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tulos} alt="Brändätty pohjakuva" className="w-full" />
            </div>

            <div className="flex gap-4">
              <a
                href={tulos}
                download="pohjakuva-brandatty.png"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Lataa PNG
              </a>
              <button
                onClick={() => {
                  setVaihe("lataus");
                  setTiedosto(null);
                  setEsikatselu(null);
                  setTulos(null);
                  setLaatu(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Brändää uusi kuva
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
