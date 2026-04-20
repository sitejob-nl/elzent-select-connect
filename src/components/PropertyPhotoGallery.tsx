import { useEffect, useRef, useState } from "react";
import { Eye, ImageOff, X } from "lucide-react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContentBare, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { propertyTypeLabel } from "@/lib/taxonomy";

export type GalleryImage = {
  id: string;
  url: string;
  alt_text: string | null;
  is_hero: boolean;
  sort_order: number;
};

type Props = {
  images: GalleryImage[];
  fallbackImageUrl: string | null;
  title: string;
  location: string;
  isNew: boolean;
  matchScore: number;
  propertyType: string | null;
  viewCount: number;
};

// Module-level constant so the carousel's `useEffect` dep-array on `opts`
// doesn't re-run (and re-init Embla) on every render.
const CAROUSEL_OPTS = { loop: false } as const;

// Hero height shared between the container, Carousel, CarouselContent and
// CarouselItem so the four stay in lockstep when tweaked.
const HERO_HEIGHT_CLASSES = "h-64 sm:h-80 lg:h-96";

/**
 * Hero photo gallery with carousel, thumbnail strip and lightbox.
 * Renders property images in order; falls back to legacy image_url when
 * no property_images rows exist. Shows a neutral placeholder when empty.
 */
const PropertyPhotoGallery = ({
  images,
  fallbackImageUrl,
  title,
  location,
  isNew,
  matchScore,
  propertyType,
  viewCount,
}: Props) => {
  // Resolve effective slides: prefer property_images; otherwise synthesize a
  // single legacy slide from fallbackImageUrl. When both are absent we render
  // a placeholder without a carousel at all.
  const slides: GalleryImage[] =
    images.length > 0
      ? images
      : fallbackImageUrl
        ? [
            {
              id: "legacy",
              url: fallbackImageUrl,
              alt_text: title,
              is_hero: true,
              sort_order: 0,
            },
          ]
        : [];

  const total = slides.length;
  const hasMultiple = total > 1;

  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [lightboxApi, setLightboxApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Track whether the hero carousel is currently being dragged so a
  // swipe-ends-in-click (a touchend fired after a drag) doesn't open the
  // lightbox. Embla fires `scroll` continuously while dragging and `settle`
  // when the drag completes — we flip this ref on pointerDown and set it to
  // true as soon as any scroll happens during that gesture.
  const draggingRef = useRef(false);
  useEffect(() => {
    if (!heroApi) return;
    const onPointerDown = () => {
      draggingRef.current = false;
    };
    const onScroll = () => {
      draggingRef.current = true;
    };
    heroApi.on("pointerDown", onPointerDown);
    heroApi.on("scroll", onScroll);
    return () => {
      heroApi.off("pointerDown", onPointerDown);
      heroApi.off("scroll", onScroll);
    };
  }, [heroApi]);

  // Track the active slide from the hero carousel.
  useEffect(() => {
    if (!heroApi) return;
    const onSelect = () => setSelectedIndex(heroApi.selectedScrollSnap());
    onSelect();
    heroApi.on("select", onSelect);
    heroApi.on("reInit", onSelect);
    return () => {
      heroApi.off("select", onSelect);
      heroApi.off("reInit", onSelect);
    };
  }, [heroApi]);

  // Track the active slide from the lightbox carousel while it's open.
  useEffect(() => {
    if (!lightboxApi) return;
    const onSelect = () => setSelectedIndex(lightboxApi.selectedScrollSnap());
    onSelect();
    lightboxApi.on("select", onSelect);
    lightboxApi.on("reInit", onSelect);
    return () => {
      lightboxApi.off("select", onSelect);
      lightboxApi.off("reInit", onSelect);
    };
  }, [lightboxApi]);

  // When the lightbox opens, jump its carousel to the hero's current slide.
  useEffect(() => {
    if (!lightboxOpen || !lightboxApi) return;
    lightboxApi.scrollTo(selectedIndex, true);
    // Intentionally depend only on open + api readiness: we want the one-shot
    // sync at open-time. Further changes inside the lightbox are handled by
    // its own onSelect above and propagated back to the hero via the effect
    // below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxApi]);

  // When the lightbox closes, make sure the hero lands on the last viewed slide.
  useEffect(() => {
    if (lightboxOpen || !heroApi) return;
    if (heroApi.selectedScrollSnap() !== selectedIndex) {
      heroApi.scrollTo(selectedIndex, true);
    }
  }, [lightboxOpen, heroApi, selectedIndex]);

  const jumpTo = (index: number) => {
    heroApi?.scrollTo(index);
  };

  const openLightboxIfNotDragging = () => {
    if (!draggingRef.current) {
      setLightboxOpen(true);
    }
  };

  // Empty state: no property_images, no legacy image_url.
  if (total === 0) {
    return (
      <div className={cn("relative rounded-xl overflow-hidden mb-8 bg-muted flex flex-col items-center justify-center text-muted-foreground", HERO_HEIGHT_CLASSES)}>
        <ImageOff className="h-10 w-10 mb-3 opacity-60" />
        <p className="font-body text-sm">Nog geen afbeeldingen beschikbaar</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className={cn("relative rounded-xl overflow-hidden", HERO_HEIGHT_CLASSES)}>
          <Carousel
            setApi={setHeroApi}
            opts={CAROUSEL_OPTS}
            className={HERO_HEIGHT_CLASSES}
            aria-label={`Afbeeldingen van ${title}`}
          >
            <CarouselContent className={cn("ml-0", HERO_HEIGHT_CLASSES)}>
              {slides.map((img, idx) => (
                <CarouselItem key={img.id} className={cn("pl-0 relative", HERO_HEIGHT_CLASSES)}>
                  {/* Clickable image area — opens the lightbox (unless this
                      click is the tail end of a swipe gesture). */}
                  <button
                    type="button"
                    onClick={openLightboxIfNotDragging}
                    aria-label={`Open afbeelding ${idx + 1} van ${total} op volledig scherm`}
                    className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={img.url}
                      alt={img.alt_text ?? `${title} — afbeelding ${idx + 1}`}
                      aria-hidden="true"
                      className="w-full h-full object-cover"
                      draggable={false}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      {...(idx === 0 ? { fetchpriority: "high" as const } : {})}
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>

            {hasMultiple && (
              <>
                <CarouselPrevious
                  aria-label="Vorige"
                  className="hidden md:inline-flex left-4 h-10 w-10 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-primary hover:text-white hover:border-primary transition-colors"
                />
                <CarouselNext
                  aria-label="Volgende"
                  className="hidden md:inline-flex right-4 h-10 w-10 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-primary hover:text-white hover:border-primary transition-colors"
                />
              </>
            )}
          </Carousel>

          {/* Gradient — below the overlay content, above the image. Never
              intercepts pointer events so swipes pass through to the image. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Persistent overlay (badges + title + location). Rendered outside
              the Carousel so it stays visible on every slide. `pointer-events-none`
              lets the swipe/tap reach the image-button beneath it. */}
          <div className="pointer-events-none absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isNew && (
                <span className="px-2 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-sm">
                  Nieuw
                </span>
              )}
              {matchScore > 0 && (
                <span className="px-2 py-1 bg-white/20 text-white text-xs font-medium rounded-sm backdrop-blur-sm">
                  {matchScore}% Match
                </span>
              )}
              {propertyType && (
                <span className="px-2 py-1 bg-primary/80 text-white text-xs font-medium rounded-sm backdrop-blur-sm">
                  {propertyTypeLabel(propertyType)}
                </span>
              )}
              {viewCount > 0 && (
                <span className="px-2 py-1 bg-white/10 text-white text-xs font-medium rounded-sm backdrop-blur-sm flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {viewCount} keer bekeken
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-white mb-1 break-words [overflow-wrap:anywhere]">
              {title}
            </h1>
            <p className="text-gray-200">{location}</p>
          </div>

          {/* Slide counter */}
          {hasMultiple && (
            <div
              className="pointer-events-none absolute bottom-4 right-4 px-2 py-1 rounded-sm bg-black/50 text-white text-xs font-body backdrop-blur-sm"
              aria-live="polite"
              aria-atomic="true"
            >
              {selectedIndex + 1} / {total}
            </div>
          )}
        </div>

        {/* Thumbnail strip — only when there are 2+ images. */}
        {hasMultiple && (
          <div className="mt-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:thin]">
            <div className="flex gap-2 pb-1">
              {slides.map((img, idx) => {
                const active = idx === selectedIndex;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => jumpTo(idx)}
                    aria-label={`Afbeelding ${idx + 1} van ${total}`}
                    aria-current={active}
                    className={cn(
                      "shrink-0 snap-start rounded-md overflow-hidden border-2 transition-all",
                      "w-12 h-9 sm:w-16 sm:h-12",
                      active
                        ? "border-primary shadow-sm"
                        : "border-transparent opacity-70 hover:opacity-100 hover:border-primary/40",
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.alt_text ?? `${title} — thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox. `DialogContentBare` omits shadcn's default close button so we
          don't need a `[&>button]:hidden` selector (which would also hide the
          carousel arrow buttons rendered inside). */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContentBare
          className="max-w-[96vw] w-[96vw] h-[92vh] p-0 bg-black/95 border-0 sm:rounded-lg overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden.Root>
            <DialogTitle>{`Afbeeldingen van ${title}`}</DialogTitle>
            <DialogDescription>
              Gebruik pijltjestoetsen om te navigeren. Druk op Escape om te sluiten.
            </DialogDescription>
          </VisuallyHidden.Root>
          <div className="relative w-full h-full flex items-center justify-center">
            <Carousel
              setApi={setLightboxApi}
              opts={CAROUSEL_OPTS}
              className="w-full h-full"
              aria-label={`Afbeeldingen van ${title} — volledig scherm`}
            >
              <CarouselContent className="ml-0 h-[92vh]">
                {slides.map((img, idx) => (
                  <CarouselItem
                    key={img.id}
                    className="pl-0 h-[92vh] flex items-center justify-center"
                  >
                    <img
                      src={img.url}
                      alt={img.alt_text ?? `${title} — afbeelding ${idx + 1}`}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {hasMultiple && (
                <>
                  <CarouselPrevious
                    aria-label="Vorige"
                    className="left-4 h-11 w-11 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-primary hover:text-white hover:border-primary"
                  />
                  <CarouselNext
                    aria-label="Volgende"
                    className="right-4 h-11 w-11 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-primary hover:text-white hover:border-primary"
                  />
                </>
              )}
            </Carousel>

            {/* Custom close button (replaces shadcn's default, which
                DialogContentBare omits entirely). */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Sluiten"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-primary hover:border-primary transition-colors flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Slide counter — only when multiple */}
            {hasMultiple && (
              <div
                className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-body backdrop-blur-sm"
                aria-live="polite"
                aria-atomic="true"
              >
                Afbeelding {selectedIndex + 1} van {total}
              </div>
            )}
          </div>
        </DialogContentBare>
      </Dialog>
    </>
  );
};

export default PropertyPhotoGallery;
