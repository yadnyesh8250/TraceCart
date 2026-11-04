# Research and Design Notes
## TraceRoyale / TraceCart requirements

**Research method:** Consensus deep research was attempted on 2026-11-04 but unavailable because the account had exhausted its monthly usage. This is a standards/primary-source fallback review, not a Consensus synthesis. The product requirements are primarily derived from the user-provided product brief; references below inform design constraints and risk treatment.

## Findings applied to requirements

### 1. Asset identity and provenance

- C2PA defines manifests with assertions, a claim, a signature, and a hard binding to content. A valid binding can detect when covered content has changed; provenance statements still need interpretation and do not constitute a copyright ownership adjudication. The MVP should store a cryptographic file hash and treat C2PA as optional provenance metadata, with an explicit validation state.
- The W3C PROV model represents provenance through entities, activities, and agents and relationships such as derivation, attribution, and association. TraceRoyale's lineage view can adopt this conceptual model: asset (entity), licence/use/calculation/payout (activities), creator/application/provider (agents).
- Research auditing AI dataset licences finds gaps and inconsistencies in dataset provenance and licensing records, supporting versioned source/rights metadata and explicit uncertainty rather than a claim of complete provenance.

Sources:
- C2PA Content Credentials specification: https://spec.c2pa.org/specifications/specifications/2.5/specs/ContentCredentials.html
- C2PA specifications overview: https://spec.c2pa.org/specifications/
- W3C PROV semantics: https://www.w3.org/TR/prov-sem/
- Longpre et al., “A large-scale audit of dataset licensing and attribution in AI,” *Nature Machine Intelligence* (2024): https://www.nature.com/articles/s42256-024-00878-8

### 2. Reported usage and event security

- Usage events submitted by a licensee are evidence that the participating application reported an event; they do not independently prove complete reporting, business revenue, or the causal influence of an asset on model training/output.
- Webhook/API event handling should authenticate senders, validate schemas and licence state, deduplicate by stable event ID, handle retries, and keep corrections as traceable adjustments. OWASP's webhook guidance highlights signature checks, replay defenses, idempotency, payload validation, rate limits, and logging without secrets.
- PayPal documents webhook signature verification and retries for non-2xx responses. Therefore, payment state updates must be asynchronous, verified, retry-safe, and reconciled against provider state.

Sources:
- OWASP Webhook Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html
- PayPal webhook integration: https://developer.paypal.com/api/rest/webhooks/rest/
- PayPal webhook overview: https://developer.paypal.com/api/rest/webhooks/

### 3. Rights, licensing, and AI limitations

- Provenance and data transparency can improve informed decision-making but do not resolve copyright questions by themselves. The Data Provenance Initiative research discusses incomplete and conflicting dataset licence information and remaining legal ambiguity.
- The U.S. Copyright Office's AI work is jurisdiction-specific and ongoing; requirements should record what the parties agreed while avoiding universal claims about ownership, training use, or output rights.
- The product's explicit boundary is therefore: no universal use discovery, no ownership adjudication, no causal training/output inference. Contract terms and dispute/takedown processes need counsel and policy review.

Sources:
- U.S. Copyright Office, Copyright and Artificial Intelligence: https://www.copyright.gov/ai/
- U.S. Copyright Office, Part 3: Generative AI Training (pre-publication report page): https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf
- Longpre et al. (2024), dataset licensing and provenance audit: https://www.nature.com/articles/s42256-024-00878-8
- Buick, “Copyright and AI training data—transparency to the rescue?” *Journal of Intellectual Property Law & Practice* (2025): https://doi.org/10.1093/jiplp/jpae102

### 4. Usage and royalty exchange patterns

- DDEX's Recording Data and Rights standards demonstrate structured exchange of repertoire/rights metadata and usage/revenue reports in music licensing workflows. TraceRoyale should use a versioned API schema for its initial pilot and avoid assuming a universal cross-media standard already exists.
- Royalty requirements should preserve the reported basis, source, licence version, calculation formula, currency, rounding policy, allocations, adjustments, and settlement references. Revenue-share evidence must remain marked as licensee-reported unless independently reconciled.

Source:
- DDEX Recording Data and Rights: https://ddex.net/standards/recording-data-and-rights/

### 5. AI-assisted licence structuring

- The provided product brief specifies AI as drafting/interpretation support, not the authority for legal or financial decisions. Requirements therefore enforce schema validation, missing-field prompts, explicit uncertainty, creator review, and deterministic backend enforcement/calculation.
- For high-impact permissions and fees, AI output remains a draft. No model output activates a licence or sets a rate without explicit creator approval.

## Design implications and MVP recommendation

1. Pilot with one participating application and one agreed media type.
2. Start with fixed per-use rates; add revenue share only after reporting, correction, refund, and audit policy is agreed.
3. Use immutable licence versions and append-only financial entries with compensating reversals.
4. Treat usage as partner-reported; define audit rights and dispute procedures in partner agreements.
5. Require server-side payment verification and idempotent webhook handling.
6. Keep C2PA/provenance optional in MVP; show absent, invalid, and valid distinctly.
7. Require counsel review for licence templates, privacy, rights disputes, payments, tax, and any handling of creator funds.

## Limitations

- Consensus deep research was not completed due to account quota. This fallback uses the linked standards, primary documentation, government material, and peer-reviewed work listed above.
- References inform engineering requirements; they do not establish legal conclusions for every jurisdiction or demonstrate market adoption.
- The exact TraceCart/TraceRoyale name, pilot partner, media type, jurisdiction, compensation basis, and business model still need owner confirmation.
