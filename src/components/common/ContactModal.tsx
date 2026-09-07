import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setErrorMessage("Please provide a valid email address so we can reply.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Please enter a subject line for your inquiry.");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setErrorMessage("Please write a detailed message (minimum 10 characters).");
      return;
    }

    setLoading(true);

    // Simulate reliable local dispatch & ticket generation
    setTimeout(() => {
      setLoading(false);
      const generatedId = `LAYA-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketId(generatedId);
      setSubmitted(true);
    }, 600);
  };

  const handleResetAndClose = () => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setCategory("support");
    setErrorMessage(null);
    setSubmitted(false);
    setTicketId(null);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4 select-none"
      onClick={handleResetAndClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-dialog max-w-lg w-full space-y-5 animate-dialog-in text-left relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Close dialog"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {!submitted ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <LifeBuoy className="h-4 w-4" />
                </span>
                <h2 id="contact-modal-title" className="text-base font-semibold tracking-tight text-foreground">
                  Contact Laya Support & Inquiries
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with the engineering team. All diagnostic notes remain strictly confidential.
              </p>
            </div>

            {/* Direct Contact & Response Promise Banner */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Response Promise: We respond to all inquiries within 24 business hours.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <a
                  href="mailto:support@layaworkspace.org"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors truncate"
                  title="Send email"
                >
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-[11px] truncate">support@layaworkspace.org</span>
                </a>
                <a
                  href="tel:+18005550199"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors truncate"
                  title="Call team"
                >
                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-[11px]">+1 (800) 555-0199</span>
                </a>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground block">
                    Your Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground block">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-medium text-foreground block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                  >
                    <option value="support">Technical Support</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Proposal</option>
                    <option value="feedback">General Feedback</option>
                    <option value="license">License & Billing</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-medium text-foreground block">
                    Subject Line <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your inquiry"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground block">
                  Detailed Message <span className="text-primary">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question or issue in detail..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>100% Private · Zero Telemetry</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Sending inquiry…</span>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          /* Post-Inquiry Thank-You State */
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Inquiry Received · Thank You!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your message has been safely logged with ticket identifier{" "}
                <span className="font-mono font-semibold text-foreground px-1.5 py-0.5 rounded bg-muted border border-border/70">
                  {ticketId}
                </span>
                . Our core engineering team will follow up via email within 24 business hours.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/70 text-xs text-left text-muted-foreground space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Inquirer:</span>
                <span>{name} ({email})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Subject:</span>
                <span className="truncate max-w-[200px]">{subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Expected Reply:</span>
                <span className="text-primary font-medium">Within 24 Hours</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Back to Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
