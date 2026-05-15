# Pohjakuva – Automaattinen brändäystyökalu

Kiinteistövälittäjän työkalu pohjakuvien automaattiseen brändäykseen. Aseta bränditiedot kerran, lataa pohjakuva ja saat valmiin brändätyn kuvan muutamassa sekunnissa.

## Ominaisuudet

- **Brändiasetuket kerran**: Logo, värit, yhteystiedot – tallentuvat selaimeen
- **Automaattinen brändäys**: Footer brändivärein + logo + yhteystiedot
- **AI-analyysi**: Claude Vision tunnistaa pohjakuvan sisällön (valinnainen)
- **Nopea**: Kaikki käsittely palvelimella, tulos sekunneissa

## Asennus

```bash
npm install
```

Luo `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Kehitys

```bash
npm run dev
```

Avaa [http://localhost:3000](http://localhost:3000)

## Deployment – Vercel

1. Pushaa GitHub-repoon
2. Yhdistä Vercel → sivutnopeasti/pohjakuva
3. Lisää ympäristömuuttuja `ANTHROPIC_API_KEY` Vercel-projektiin
4. Deploy!

## Teknologia

- **Next.js 15** – React-framework
- **Claude (Anthropic)** – AI-pohjakuvaanalyysi
- **Sharp** – Kuvankäsittely palvelimella
- **Tailwind CSS** – Tyylit
- **Vercel** – Hosting
