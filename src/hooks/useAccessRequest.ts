import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AccessRequestInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}

export function useSubmitAccessRequest() {
  return useMutation({
    mutationFn: async (input: AccessRequestInput) => {
      const { error } = await supabase
        .from("access_requests")
        .insert({
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          company: input.company || null,
          message: input.message || null,
        });
      if (error) {
        if (error.message?.includes("duplicate") || error.code === "23505") {
          throw new Error("Er is al een aanvraag met dit e-mailadres ingediend.");
        }
        throw error;
      }
    },
  });
}
