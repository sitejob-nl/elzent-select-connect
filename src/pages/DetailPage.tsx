import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowLeft, MessageSquare } from "lucide-react";
import bastionImg from "@/assets/property-bastion.jpg";

const financials = [
  { label: "Aankoopprijs pand", value: "€ 1.250.000" },
  { label: "Verbouwkosten (incl. onvoorzien)", value: "€ 720.000" },
  { label: "Kosten koper / bijkomend", value: "€ 130.000" },
  { label: "Totale investering", value: "€ 2.100.000", bold: true },
  { label: "Bruto huurinkomsten (jaar)", value: "€ 151.200" },
  { label: "Exploitatiekosten", value: "€ 22.700" },
  { label: "Netto huurinkomsten (jaar)", value: "€ 128.500", bold: true },
  { label: "BAR", value: "7.2%", bold: true },
];

const timeline = [
  { title: "Interesse tonen", sub: "Nu mogelijk", desc: "Ontvang het volledige informatiepakket.", active: true },
  { title: "Bezichtiging & Due Diligence", sub: "Maart – April 2026", desc: "Persoonlijke bezichtiging, financiering en taxatie.", active: false },
  { title: "Voorstel & Afname", sub: "Deadline 15 mei · Afname 31 juli 2026", desc: "Niet-bindend voorstel indienen, gevolgd door eigendomsoverdracht.", active: false },
];

const DetailPage = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body mb-6">
          <Link to="/aanbod" className="hover:text-primary transition-colors">Aanbod</Link>
          <span>/</span>
          <span className="text-foreground">Bastion 1</span>
        </div>

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden relative h-64 md:h-96 mb-8">
          <img src={bastionImg} alt="Bastion 1" className="w-full h-full object-cover" width={1280} height={768} />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold">Nieuw</span>
              <span className="px-2.5 py-1 rounded-full bg-card/80 backdrop-blur text-foreground text-xs font-body">97% Match</span>
              <span className="px-2.5 py-1 rounded-full bg-card/80 backdrop-blur text-foreground text-xs font-body">Transformatie</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Bastion 1 – Transformatie</h1>
            <p className="text-primary-foreground/70 font-body mt-1">'s-Hertogenbosch · Kantoor → 24 appartementen</p>
          </div>
        </div>

        {/* Match Banner */}
        <div className="rounded-xl bg-gold-light border border-primary/20 p-4 flex items-start gap-3 mb-8">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-body font-semibold text-foreground text-sm">Waarom deze match?</p>
            <p className="font-body text-muted-foreground text-sm">
              Regio, budget (€500k–€2.5m) en transformatieprojecten passen bij uw profiel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Investering", value: "€ 2.1M" },
                { label: "BAR", value: "7.2%" },
                { label: "Huurinkomsten", value: "€ 151K/jr" },
                { label: "Eenheden", value: "24" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-card border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-3">Project Beschrijving</h2>
              <p className="font-body text-muted-foreground leading-relaxed text-sm">
                Bastion 1 betreft de transformatie van een voormalig kantoorpand (BJ 1992) in het historische centrum van 's-Hertogenbosch naar 24 moderne huurappartementen, op loopafstand van het centraal station.
              </p>
              <p className="font-body text-muted-foreground leading-relaxed text-sm mt-3">
                18 tweekamerappartementen (45-55 m²) en 6 driekamerappartementen (65-75 m²), allen energielabel A. Bouwvergunning verleend, oplevering Q3 2026. Verwachte huurprijs € 950 – € 1.350/maand per eenheid.
              </p>
            </div>

            {/* Timeline */}
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Tijdlijn & Proces</h2>
              <div className="space-y-0">
                {timeline.map((t, i) => (
                  <div key={i} className="relative pl-8 pb-6 last:pb-0">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[0.45rem] top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 ${
                      t.active ? "border-primary bg-primary" : "border-border bg-card"
                    }`} />
                    <h3 className="font-body font-semibold text-foreground text-sm">{t.title}</h3>
                    <p className="text-xs text-primary font-body">{t.sub}</p>
                    <p className="text-sm text-muted-foreground font-body mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Financieel Overzicht</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                {financials.map((f, i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-5 py-3 font-body text-sm ${
                      i % 2 === 0 ? "bg-card" : "bg-muted/30"
                    } ${f.bold ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span>{f.label}</span>
                    <span className={f.bold ? "text-primary" : ""}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Interesse in dit project?</h3>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Toon uw interesse en wij nemen persoonlijk contact met u op.
              </p>
              <ul className="space-y-2 mb-5">
                {["Volledige documentatie ontvangen", "Bezichtiging inplannen", "Persoonlijk contact met ons team"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-body text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="gold" size="lg" className="w-full">
                Interesse Tonen →
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-body font-semibold text-foreground text-sm mb-3">Status</h3>
              <div className="space-y-2 text-sm font-body">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interesse fase</span>
                  <span className="text-primary font-semibold">Huidige fase</span>
                </div>
                <p className="text-muted-foreground">4 investeerders geïnteresseerd</p>
                <p className="text-muted-foreground">Afname: 31 juli 2026</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-body font-semibold text-foreground text-sm mb-3">Vragen?</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-secondary-foreground">WB</span>
                </div>
                <div>
                  <p className="font-body font-semibold text-foreground text-sm">Wessel Bollen</p>
                  <button className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Stuur bericht
                  </button>
                </div>
              </div>
            </div>

            <Link
              to="/aanbod"
              className="flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Terug naar aanbod
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DetailPage;
