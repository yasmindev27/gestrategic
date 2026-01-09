import { useState, useEffect } from "react";

type ConsentStatus = "pending" | "accepted" | "rejected";

export const useLGPDConsent = () => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lgpd_consent");
    if (stored === "accepted") {
      setConsentStatus("accepted");
    } else if (stored === "rejected") {
      setConsentStatus("rejected");
    }
    setIsLoading(false);
  }, []);

  const acceptConsent = () => {
    localStorage.setItem("lgpd_consent", "accepted");
    localStorage.setItem("lgpd_consent_date", new Date().toISOString());
    setConsentStatus("accepted");
  };

  const rejectConsent = () => {
    localStorage.setItem("lgpd_consent", "rejected");
    setConsentStatus("rejected");
  };

  const resetConsent = () => {
    localStorage.removeItem("lgpd_consent");
    localStorage.removeItem("lgpd_consent_date");
    setConsentStatus("pending");
  };

  return {
    consentStatus,
    isLoading,
    acceptConsent,
    rejectConsent,
    resetConsent,
  };
};
