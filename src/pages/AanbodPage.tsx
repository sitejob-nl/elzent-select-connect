import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import bastionImg from "@/assets/property-bastion.jpg";
import strijpImg from "@/assets/property-strijp.jpg";
import paleisImg from "@/assets/property-paleiskwartier.jpg";

const properties = [
  {
    slug: "bastion-1",
    title: "Bastion 1 – Transformatie",
    location: "'s-Hertogenbosch · 24 appartementen",
    price: "€ 2.1M",
    bar: "7.2%",
    type: "Transformatie",
    match: 97,
    badge: "Nieuw",
    time: "3 dagen geleden",
    image: bastionImg,
  },
  {
    slug: "strijp-s",
    title: "Strijp-S Lofts",
    location: "Eindhoven · 8 loftwoningen",
    price: "€ 1.8M",
    bar: "5.9%",
    type: "Nieuwbouw",
    match: 89,
    badge: "Exclusief",
    time: "1 week geleden",
    image: strijpImg,
  },
  {
    slug: "paleiskwartier",
    title: "Paleiskwartier Blok C",
    location: "'s-Hertogenbosch · Kamerverhuurpand",
    price: "€ 890K",
    bar: "8.1%",
    type: "Kamerverhuur",
    match: 82,
    badge: null,
    time: "2 weken geleden",
    image: paleisImg,
  },
];

const AanbodPage = () => {
  const [filter, setFilter] = useState<"matches" | "all">("matches");

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">Exclusief Aanbod</h1>
          <p className="text-muted-foreground font-body mt-1">
            Kwalitatief vastgoed, persoonlijk gecontroleerd door onze specialisten.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter("matches")}
              className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${
                filter === "matches" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Uw matches
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-body transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Al het aanbod
            </button>
          </div>
        </div>

        <div className="space-y-5 stagger">
          {properties.map((p) => (
            <Link
              key={p.slug}
              to={`/aanbod/${p.slug}`}
              className="group flex flex-col md:flex-row rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all animate-fade-in-up"
            >
              <div className="md:w-72 h-48 md:h-auto overflow-hidden relative">
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  width={1280}
                  height={768}
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {p.badge && (
                    <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold">
                      {p.badge}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-card/90 backdrop-blur text-foreground text-xs font-body font-semibold">
                    {p.match}% Match
                  </span>
                </div>
              </div>

              <div className="flex-1 p-5 md:p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground font-body mt-1">{p.location}</p>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Investering</p>
                    <p className="font-display font-bold text-foreground">{p.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">BAR</p>
                    <p className="font-display font-bold text-emerald-600">{p.bar}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Type</p>
                    <p className="font-body font-semibold text-foreground">{p.type}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground font-body">{p.time}</span>
                  <span className="text-sm text-primary font-body font-semibold group-hover:underline">Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AanbodPage;
