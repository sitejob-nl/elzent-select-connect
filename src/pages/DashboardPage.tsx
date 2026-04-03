import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Heart, Landmark, TrendingUp, Sparkles } from "lucide-react";
import bastionImg from "@/assets/property-bastion.jpg";
import strijpImg from "@/assets/property-strijp.jpg";

const stats = [
  { label: "Actieve Interesse", value: "3", sub: "+1 deze maand", icon: Heart, color: "text-red-400" },
  { label: "Portfolio Waarde", value: "€ 4.2M", sub: "+12.3% YTD", icon: Landmark, color: "text-primary" },
  { label: "Gem. BAR", value: "6.8%", sub: "Bruto aanvangsrendement", icon: TrendingUp, color: "text-emerald-500" },
  { label: "Nieuwe Matches", value: "2", sub: "Bekijk aanbod →", icon: Sparkles, color: "text-primary" },
];

const matches = [
  {
    title: "Bastion 1 – Transformatie",
    location: "'s-Hertogenbosch · 24 appartementen",
    matchReason: "Match: regio + budget + type",
    price: "€ 2.1M",
    bar: "BAR 7.2%",
    image: bastionImg,
    slug: "bastion-1",
  },
  {
    title: "Strijp-S Lofts",
    location: "Eindhoven · 8 loftwoningen",
    matchReason: "Match: regio + rendement",
    price: "€ 1.8M",
    bar: "BAR 5.9%",
    image: strijpImg,
    slug: "strijp-s",
  },
];

const DashboardPage = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welkom terug, <span className="text-primary">Jan</span>
        </h1>
        <p className="text-muted-foreground font-body mt-1">Uw overzicht van vandaag.</p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 stagger">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow animate-fade-in-up"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-body">{s.label}</span>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent matches */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-semibold text-foreground">Recente Matches</h2>
            <Link to="/aanbod" className="text-sm text-primary font-body hover:underline">Bekijk alles →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matches.map((m) => (
              <Link
                key={m.slug}
                to={`/aanbod/${m.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={m.image}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width={1280}
                    height={768}
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display font-semibold text-foreground">{m.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mt-1">{m.location}</p>
                  <p className="text-xs text-primary font-body mt-2 gold-border-left pl-2">{m.matchReason}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="font-display font-bold text-foreground">{m.price}</span>
                    <span className="text-sm text-emerald-600 font-body">{m.bar}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
