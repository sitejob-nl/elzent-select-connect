import { useState } from "react";
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
import { Loader2 } from "lucide-react";

interface InterestConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyTitle: string;
  onConfirm: (message: string) => Promise<void>;
  submitting: boolean;
}

export default function InterestConfirmDialog({
  open,
  onOpenChange,
  propertyTitle,
  onConfirm,
  submitting,
}: InterestConfirmDialogProps) {
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    await onConfirm(message);
    setMessage("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Interesse tonen in {propertyTitle}?</AlertDialogTitle>
          <AlertDialogDescription>
            Na bevestigen nemen wij binnen 48 uur contact met u op om de
            vervolgstappen te bespreken. U ontvangt direct een bevestiging per
            e-mail. Aan het tonen van interesse zijn geen verplichtingen
            verbonden.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Optioneel: bericht aan ons team
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="bv. vragen over de huurstroom of bezichtigingsmoment…"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Ja, interesse tonen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
