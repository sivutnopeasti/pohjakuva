import Link from "next/link";
import { Settings, Upload, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Pohjakuva</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/brandi"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Brändiasetuket
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Tekoälypohjainen automaatio
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Pohjakuvaan brändi<br />yhdellä klikkauksella
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Lataa taloyhtiön pohjakuva, tekoäly tunnistaa sen sisällön ja
            lisää välitysliikkeen brändin automaattisesti – logo, värit ja
            typografia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/brandays"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              <Upload className="w-5 h-5" />
              Lataa pohjakuva
            </Link>
            <Link
              href="/brandi"
              className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              <Settings className="w-5 h-5" />
              Aseta brändi ensin
            </Link>
          </div>
        </div>

        {/* Steps */}
        <div className="max-w-4xl w-full mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Aseta brändi kerran",
              desc: "Lataa logo ja valitse värit. Tiedot tallentuvat automaattisesti kaikkia kuvia varten.",
            },
            {
              step: "2",
              title: "Lataa pohjakuva",
              desc: "Tuo taloyhtiön pohjakuva (PNG, JPG tai PDF). Tekoäly analysoi sen sisällön.",
            },
            {
              step: "3",
              title: "Lataa brändätty kuva",
              desc: "Muutamassa sekunnissa valmis kuva logolla, väreillä ja layoutilla.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
