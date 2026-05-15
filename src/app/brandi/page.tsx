"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Trash2, CheckCircle, Zap } from "lucide-react";
import {
  BrandiAsetukset,
  haeBrandi,
  oletusAsetukset,
  tallennaBrandi,
} from "@/lib/brandi";

export default function BrandiSivu() {
  const [asetukset, setAsetukset] = useState<BrandiAsetukset>(oletusAsetukset);
  const [tallennettu, setTallennettu] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAsetukset(haeBrandi());
  }, []);

  function paivita(kentta: keyof BrandiAsetukset, arvo: string | null) {
    setAsetukset((prev) => ({ ...prev, [kentta]: arvo }));
  }

  function tallenna() {
    tallennaBrandi(asetukset);
    setTallennettu(true);
    setTimeout(() => setTallennettu(false), 3000);
  }

  function kasitteleLogoLataus(e: React.ChangeEvent<HTMLInputElement>) {
    const tiedosto = e.target.files?.[0];
    if (!tiedosto) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      paivita("logo", ev.target?.result as string);
      paivita("logoTiedostoNimi", tiedosto.name);
    };
    reader.readAsDataURL(tiedosto);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <button
            onClick={tallenna}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
          >
            {tallennettu ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Tallennettu!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Tallenna
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brändiasetuket</h1>
          <p className="text-gray-600 mt-1">
            Aseta kerran – käytetään automaattisesti kaikissa pohjakuvissa.
          </p>
        </div>

        {/* Yritystiedot */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Yritystiedot</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yrityksen nimi *
              </label>
              <input
                type="text"
                value={asetukset.yritysNimi}
                onChange={(e) => paivita("yritysNimi", e.target.value)}
                placeholder="Esim. Kiinteistöt Oy"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slogan / motto
              </label>
              <input
                type="text"
                value={asetukset.slogan}
                onChange={(e) => paivita("slogan", e.target.value)}
                placeholder="Esim. Kodin asiantuntija"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Puhelinnumero
              </label>
              <input
                type="text"
                value={asetukset.puhelinnumero}
                onChange={(e) => paivita("puhelinnumero", e.target.value)}
                placeholder="+358 40 123 4567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sähköposti
              </label>
              <input
                type="email"
                value={asetukset.sahkoposti}
                onChange={(e) => paivita("sahkoposti", e.target.value)}
                placeholder="info@kiinteistot.fi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verkkosivusto
              </label>
              <input
                type="text"
                value={asetukset.verkkosivusto}
                onChange={(e) => paivita("verkkosivusto", e.target.value)}
                placeholder="www.kiinteistot.fi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 text-lg">Logo</h2>
          <p className="text-sm text-gray-500">
            Suositeltu: PNG läpinäkyvällä taustalla, vähintään 400px leveä.
          </p>

          {asetukset.logo ? (
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center w-48 h-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asetukset.logo}
                  alt="Logo"
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm text-gray-700 font-medium mb-1">
                  {asetukset.logoTiedostoNimi}
                </p>
                <button
                  onClick={() => {
                    paivita("logo", null);
                    paivita("logoTiedostoNimi", null);
                  }}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Poista logo
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-8 transition-colors cursor-pointer"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Klikkaa ladataksesi logo (PNG, SVG)
              </span>
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg"
            className="hidden"
            onChange={kasitteleLogoLataus}
          />
        </section>

        {/* Värit */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Brändivärit</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(
              [
                {
                  kentta: "ensisijainenVari" as const,
                  nimi: "Ensisijainen väri",
                  kuvaus: "Otsikot, footer-tausta",
                },
                {
                  kentta: "toissijaineVari" as const,
                  nimi: "Toissijainen väri",
                  kuvaus: "Korostukset, reunus",
                },
                {
                  kentta: "tekstiVari" as const,
                  nimi: "Tekstin väri",
                  kuvaus: "Footerin teksti",
                },
              ] as const
            ).map((item) => (
              <div key={item.kentta}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {item.nimi}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={asetukset[item.kentta]}
                    onChange={(e) => paivita(item.kentta, e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={asetukset[item.kentta]}
                    onChange={(e) => paivita(item.kentta, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.kuvaus}</p>
              </div>
            ))}
          </div>

          {/* Esikatselu */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Esikatselu footer
            </p>
            <div
              className="rounded-xl px-6 py-4 flex items-center justify-between"
              style={{ backgroundColor: asetukset.ensisijainenVari }}
            >
              <div>
                <p
                  className="font-bold text-base"
                  style={{ color: asetukset.tekstiVari }}
                >
                  {asetukset.yritysNimi || "Yrityksen nimi"}
                </p>
                {asetukset.slogan && (
                  <p
                    className="text-sm opacity-80"
                    style={{ color: asetukset.tekstiVari }}
                  >
                    {asetukset.slogan}
                  </p>
                )}
              </div>
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: asetukset.toissijaineVari }}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pb-8">
          <button
            onClick={tallenna}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            {tallennettu ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Tallennettu!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Tallenna brändiasetuket
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
