"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ContactSupportModal } from "@/components/support/ContactSupportModal";
import { ContactSupportSuccessToast } from "@/components/support/ContactSupportSuccessToast";
import type { ContactSupportSubjectValue } from "@/lib/contactSupport";

export type OpenContactSupportOptions = {
  subject?: ContactSupportSubjectValue;
  message?: string;
};

type ContactSupportContextValue = {
  openContactSupport: (options?: OpenContactSupportOptions) => void;
};

const ContactSupportContext = createContext<ContactSupportContextValue | null>(
  null,
);

export function useContactSupport(): ContactSupportContextValue {
  const ctx = useContext(ContactSupportContext);
  if (ctx) return ctx;
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[useContactSupport] useContactSupport() must be used under ContactSupportProvider. No-op used.",
    );
  }
  return { openContactSupport: () => {} };
}

type Props = { children: ReactNode };

export function ContactSupportProvider({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OpenContactSupportOptions | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openContactSupport = useCallback(
    (options?: OpenContactSupportOptions) => {
      if (
        options != null &&
        (options.subject != null || options.message != null)
      ) {
        setDraft({
          subject: options.subject,
          message: options.message,
        });
      } else {
        setDraft(null);
      }
      setOpen(true);
    },
    [],
  );

  const onCloseModal = useCallback(() => {
    setOpen(false);
    setDraft(null);
  }, []);

  const onContactSent = useCallback(() => {
    setSuccessMessage("Message sent — we'll reply soon.");
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5_000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const value = useMemo(
    () => ({ openContactSupport }),
    [openContactSupport],
  );

  return (
    <ContactSupportContext.Provider value={value}>
      {children}
      <ContactSupportModal
        open={open}
        onClose={onCloseModal}
        onSent={onContactSent}
        launchDraft={draft}
      />
      <ContactSupportSuccessToast
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
    </ContactSupportContext.Provider>
  );
}
