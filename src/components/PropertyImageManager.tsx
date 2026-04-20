import { useRef, useState, useEffect, DragEvent, ChangeEvent } from "react";
import { Loader2, Star, Trash2, ImagePlus, GripVertical, UploadCloud, AlertCircle } from "lucide-react";
import {
  usePropertyImages,
  useUploadPropertyImage,
  useUpdatePropertyImage,
  useDeletePropertyImage,
  type PropertyImage,
} from "@/hooks/usePropertyImages";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const MAX_FILES_PER_PROPERTY = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Queue entry used on the new-property flow when there is no
// property_id yet — files stay client-side until the property is
// saved, then the parent flushes the queue.
export type QueuedImage = {
  id: string;
  file: File;
  previewUrl: string;
  isHero: boolean;
};

type Props = {
  // Undefined when the property has not yet been saved. In that
  // mode we operate on a local queue instead of hitting the DB.
  propertyId: string | undefined;
  // Toggle used by the parent form to block Save while any upload
  // is in flight.
  onBusyChange?: (busy: boolean) => void;
  // Local queue (new-property flow only).
  queued?: QueuedImage[];
  onQueuedChange?: (next: QueuedImage[]) => void;
};

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Alleen JPG, PNG of WEBP zijn toegestaan.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Bestand is groter dan 5 MB.";
  }
  return null;
}

export function PropertyImageManager({
  propertyId,
  onBusyChange,
  queued = [],
  onQueuedChange,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  // Per-file pending upload indicator keyed by a short-lived UUID.
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  // Target for the delete-confirmation dialog (replaces native confirm()).
  const [deleteTarget, setDeleteTarget] = useState<PropertyImage | null>(null);

  const { data: images, isLoading } = usePropertyImages(propertyId);
  const uploadMut = useUploadPropertyImage();
  const updateMut = useUpdatePropertyImage();
  const deleteMut = useDeletePropertyImage();

  const totalCount = (images?.length ?? 0) + queued.length;
  const busy = uploading.size > 0;

  // Tell the parent form about upload state so it can block Save.
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Revoke preview URLs when the queue shrinks / unmounts so we
  // don't leak blob memory in the admin tab.
  useEffect(() => {
    return () => {
      queued.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushToQueue = (files: File[]) => {
    if (!onQueuedChange) return;
    const next = [...queued];
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        toast({ title: "Afbeelding geweigerd", description: `${file.name}: ${err}`, variant: "destructive" });
        continue;
      }
      if (next.length + (images?.length ?? 0) >= MAX_FILES_PER_PROPERTY) {
        toast({ title: "Maximum bereikt", description: `Maximaal ${MAX_FILES_PER_PROPERTY} afbeeldingen per object.`, variant: "destructive" });
        break;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        // First ever image becomes hero by default, so every
        // property has a visible card even if the admin forgets.
        isHero: next.length === 0 && (images?.length ?? 0) === 0,
      });
    }
    onQueuedChange(next);
  };

  const uploadFiles = async (files: File[]) => {
    if (!propertyId) {
      pushToQueue(files);
      return;
    }

    // React state (`uploading`) does not update within this loop, so
    // using `uploading.size` for both the cap check AND the
    // sort_order would (a) let every file past the cap because the
    // size stays 0 until the next render, and (b) assign sort_order
    // 0 to every queued upload — collapsing them on top of each
    // other. Track both via a local counter instead.
    let nextOffset = images?.length ?? 0;
    const accepted: { file: File; sortOrder: number; tempId: string }[] = [];
    for (const file of files) {
      if (nextOffset >= MAX_FILES_PER_PROPERTY) {
        toast({ title: "Maximum bereikt", description: `Maximaal ${MAX_FILES_PER_PROPERTY} afbeeldingen per object.`, variant: "destructive" });
        break;
      }
      const err = validateFile(file);
      if (err) {
        toast({ title: "Afbeelding geweigerd", description: `${file.name}: ${err}`, variant: "destructive" });
        continue;
      }
      accepted.push({ file, sortOrder: nextOffset, tempId: crypto.randomUUID() });
      nextOffset++;
    }

    if (accepted.length === 0) return;

    // Add every tempId to the in-flight set in one batch so the
    // placeholders appear together.
    setUploading((prev) => {
      const next = new Set(prev);
      for (const a of accepted) next.add(a.tempId);
      return next;
    });

    // First image uploaded onto a property with zero existing rows
    // claims hero automatically, so the card has something to show.
    const startedEmpty = (images?.length ?? 0) === 0;
    for (let i = 0; i < accepted.length; i++) {
      const { file, sortOrder, tempId } = accepted[i];
      try {
        await uploadMut.mutateAsync({
          propertyId,
          file,
          sortOrder,
          isHero: startedEmpty && i === 0,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload mislukt";
        toast({ title: "Upload mislukt", description: msg, variant: "destructive" });
      } finally {
        setUploading((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      }
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    // reset so selecting the same file twice re-triggers onChange
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) uploadFiles(files);
  };

  const handleSetHero = async (img: PropertyImage) => {
    if (!propertyId) return;
    try {
      await updateMut.mutateAsync({ id: img.id, property_id: propertyId, is_hero: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kon hero niet instellen";
      toast({ title: "Actie mislukt", description: msg, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!propertyId || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMut.mutateAsync({ id: target.id, url: target.url, property_id: propertyId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kon niet verwijderen";
      toast({ title: "Verwijderen mislukt", description: msg, variant: "destructive" });
    }
  };

  // Drag-reorder for saved images. We compute the new ordering
  // optimistically client-side, then persist sort_order for each
  // affected row.
  const handleReorder = async (targetId: string) => {
    if (!propertyId || !images || !dragId || dragId === targetId) return;
    const from = images.findIndex((i) => i.id === dragId);
    const to = images.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await Promise.all(
        next.map((img, idx) =>
          updateMut.mutateAsync({ id: img.id, property_id: propertyId, sort_order: idx }),
        ),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Volgorde opslaan mislukt";
      toast({ title: "Actie mislukt", description: msg, variant: "destructive" });
    } finally {
      setDragId(null);
    }
  };

  // Queue-mode handlers (new-property flow)
  const removeFromQueue = (id: string) => {
    if (!onQueuedChange) return;
    const target = queued.find((q) => q.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onQueuedChange(queued.filter((q) => q.id !== id));
  };

  const setQueueHero = (id: string) => {
    if (!onQueuedChange) return;
    onQueuedChange(queued.map((q) => ({ ...q, isHero: q.id === id })));
  };

  return (
    <div className="space-y-4">
      {/* Drop-zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`group cursor-pointer rounded-lg border-2 border-dashed transition-all px-6 py-8 flex flex-col items-center justify-center text-center gap-2 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
        }`}
      >
        <UploadCloud className={`h-8 w-8 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium text-foreground">
          Sleep afbeeldingen hierheen of klik om te bladeren
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG of WEBP &middot; max 5 MB per bestand &middot; max {MAX_FILES_PER_PROPERTY} per object
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {!propertyId && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Sla het object eerst op; daarna worden de afbeeldingen geupload.
          </span>
        </div>
      )}

      {/* Loading state for existing images */}
      {isLoading && propertyId ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Combined thumbnail grid */}
          {totalCount === 0 && !busy ? (
            <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
              <ImagePlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nog geen afbeeldingen toegevoegd.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Saved images */}
              {(images ?? []).map((img) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragId(img.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleReorder(img.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group relative aspect-[4/3] rounded-lg overflow-hidden border bg-muted ${
                    img.is_hero ? "border-primary ring-2 ring-primary/30" : "border-border"
                  } ${dragId === img.id ? "opacity-50" : ""}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-1.5 left-1.5 p-1 rounded bg-black/40 text-white/90 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  {img.is_hero && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-current" /> Hero
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white cursor-pointer">
                      <input
                        type="radio"
                        name="hero-image"
                        checked={img.is_hero}
                        onChange={() => handleSetHero(img)}
                        className="accent-primary h-3 w-3"
                      />
                      Hero
                    </label>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(img)}
                      disabled={deleteMut.isPending}
                      className="p-1.5 rounded-md bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Queued images (pre-save) */}
              {queued.map((q) => (
                <div
                  key={q.id}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border bg-muted ${
                    q.isHero ? "border-primary ring-2 ring-primary/30" : "border-dashed border-border"
                  }`}
                >
                  <img src={q.previewUrl} alt="" className="w-full h-full object-cover opacity-80" />
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider">
                    In wachtrij
                  </span>
                  {q.isHero && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-current" /> Hero
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white cursor-pointer">
                      <input
                        type="radio"
                        name="hero-image-queue"
                        checked={q.isHero}
                        onChange={() => setQueueHero(q.id)}
                        className="accent-primary h-3 w-3"
                      />
                      Hero
                    </label>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(q.id)}
                      className="p-1.5 rounded-md bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                      title="Verwijderen uit wachtrij"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* In-flight upload placeholders */}
              {Array.from(uploading).map((u) => (
                <div
                  key={u}
                  className="aspect-[4/3] rounded-lg border border-border bg-muted flex items-center justify-center"
                >
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {totalCount} / {MAX_FILES_PER_PROPERTY} afbeeldingen &middot; de als &ldquo;Hero&rdquo; gemarkeerde foto verschijnt op de kaart en detailpagina.
      </p>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Afbeelding verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u deze afbeelding wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
