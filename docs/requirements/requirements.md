# Product Requirements Specification
## TraceRoyale (working product name; repository: TraceCart)

**Status:** Requirements draft based on the user-provided concept brief and standards review  
**Version:** 1.0  
**Date:** 2026-11-04  
**Priority scale:** P0 = MVP launch requirement; P1 = next release; P2 = later enhancement

See [problem statement](problem-statement.md) for the source concept and product boundaries. See [research and design notes](../research/research-and-design-notes.md) for evidence, source links, and limitations.

## 1. Product goal

Provide creators and participating AI application licensees with one auditable workflow for registering assets, agreeing to structured permissions and compensation, reporting licensed use, calculating royalties, and tracking settlement.

The product is an integration service for a controlled ecosystem. It does not promise to discover uses by non-participating services or prove model-training/output causality.

## 2. Users and permissions

- **Creator:** registers assets, defines and publishes licence offers, reviews usage and royalty records, and manages payout details.
- **Licensee / application developer:** registers an application, requests asset licences, reports usage, and reviews its own licence/payment records.
- **Agency / organization:** manages authorized campaigns and licensing transactions for an organization; exact organization roles require product confirmation.
- **Administrator / support operator:** reviews account/app status, handles support and disputes, and records administrative actions. Admins must not silently rewrite financial history.

Authorization must be enforced by role and resource ownership on the server. Users may view only records they are allowed to access.

## 3. MVP scope recommendation

**P0 recommendation:** deliver a controlled pilot with creator accounts, one initial media type, fixed/per-use licensing, one participating application integration, usage-event reporting, a deterministic ledger, audit views, and payment sandbox/reconciliation. Confirm the media type and partner before implementation.

**P1:** multiple media types, hybrid pricing, multi-creator allocation, revenue-share reporting, automated PayPal Payouts if approved/eligible, more integrations, provenance imports.

**P2:** developer SDK, additional payment providers, richer analytics, expanded rights workflows, advanced anomaly detection.

This phasing is a delivery recommendation, not a change to the broader concept brief.

## 4. Functional requirements

### A. Accounts, identity, and applications

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-001 | P0 | The system shall let a creator create and manage an authenticated account. | An authenticated creator can access only their own private assets, licence offers, earnings, and payout settings. |
| FR-002 | P0 | The system shall support distinct creator, licensee-application, and administrator permissions. | API and UI requests for unauthorized roles/resources are denied and recorded without exposing protected data. |
| FR-003 | P0 | The system shall let an administrator register and disable a participating licensee application. | Each application has an identifier, status, owner, and revocable credentials; disabled credentials cannot create new valid events. |
| FR-004 | P0 | The system shall authenticate application API requests using revocable credentials and transport security. | Requests without valid credentials or over insecure transport are rejected; secrets are never returned in plaintext after creation. |

### B. Asset registry

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-010 | P0 | A creator shall be able to register an asset with a title, description, media type, file, and ownership-account reference. | Successful upload creates an asset record linked to the authenticated creator and stored object. |
| FR-011 | P0 | The system shall calculate and store a SHA-256 digest of the uploaded bytes server-side. | Re-upload of identical bytes can be compared by digest; a changed file has a different digest. The UI does not label this proof of ownership. |
| FR-012 | P0 | The system shall store a unique asset ID, upload time, media type, file format, storage reference, and licensing status. | Each asset can be retrieved by ID by its owner and authorized services; internal storage paths are not exposed as public credentials. |
| FR-013 | P0 | The creator shall be able to view, update descriptive metadata, archive, and remove an asset subject to active licence and record-retention rules. | Metadata edits are timestamped. Removal does not silently erase historical licence/financial records; unresolved active licences are surfaced before removal. |
| FR-014 | P1 | The system should accept optional provenance metadata, including a C2PA manifest when present and supported. | Imported provenance is stored with its source and validation status; invalid/unavailable provenance is shown as such, not represented as verified. |
| FR-015 | P0 | Uploads shall be subject to configured format, size, malware/content validation, and access controls. | Unsupported or oversized content is rejected with a clear error; private assets are not accessible without authorization. Limits are configurable per deployment. |

### C. Licence creation, versioning, and acceptance

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-020 | P0 | The creator shall create a licence offer for one or more assets using explicit structured fields. | A draft captures permitted use categories, media, AI generation/training permission where applicable, modification, commercial use, redistribution, duration, territory, and compensation fields. |
| FR-021 | P0 | Licence terms shall have immutable versions once published or accepted. | Editing an offer creates a new version; existing agreements remain bound to the exact accepted version. |
| FR-022 | P0 | A licensee shall request a licence and identify the intended application, use category, and campaign/generation context. | The request is linked to a licensee app, asset, proposed terms, timestamp, and request ID. |
| FR-023 | P0 | A creator or authorized rights administrator shall explicitly accept or reject a licence request. | Only an accepted request with required payment status can become active; the system stores actor, timestamp, exact version, and acceptance evidence. |
| FR-024 | P0 | The system shall block licence activation when required fields or permissions are missing or contradictory. | Validation identifies the conflicting/missing fields and does not activate the licence. |
| FR-025 | P1 | The licence assistant may convert natural-language instructions into a proposed structured draft. | The output conforms to a schema, identifies uncertain/missing fields, and remains a draft until reviewed and explicitly approved by the creator. |
| FR-026 | P1 | The assistant shall not decide ownership, supply an unstated fee/rate, or silently grant a permission. | Missing values remain unset or prompt the user; generated terms show provenance and require explicit approval. |
| FR-027 | P1 | A licensee request may be checked against a licence's structured permissions, with conflicts explained. | The result cites the relevant structured terms and is advisory; only deterministic rules decide whether the request can proceed. |

### D. Licence activation and payment collection

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-030 | P1 | The system should create a checkout/payment request for any required upfront fee. | The payment request references the licence request/version, currency, amount, and idempotency key. |
| FR-031 | P1 | Licence activation shall require server-verified successful payment when the accepted terms require upfront payment. | A client redirect or client-provided status cannot activate a licence; backend verification is required. |
| FR-032 | P1 | The system should track payment states, including created, pending, completed, failed, refunded, and disputed where supported. | Each transition records provider reference, timestamp, and source event; invalid transitions are rejected. |
| FR-033 | P1 | The system should support PayPal Orders for checkout, subject to provider account configuration and availability. | Sandbox transactions cover create, approve, capture, failure, refund, and reconciliation paths before live use. |

### E. Usage-event ingestion

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-040 | P0 | An authenticated participating application shall report a qualifying use event against an active licence. | Event includes asset ID, licence ID/version, application ID, usage category, event timestamp, unique event/idempotency key, and campaign/generation reference where applicable. |
| FR-041 | P0 | The system shall validate event authenticity, schema, application identity, asset/licence relationship, licence status, permitted use, and required fields before royalty posting. | Invalid, unauthorized, expired, or disallowed events are rejected with a reason code and are not credited. |
| FR-042 | P0 | Usage-event submission shall be idempotent. | Repeated submissions with the same authenticated event key result in at most one financial effect and return the existing event outcome. |
| FR-043 | P0 | The system shall preserve the original reported event and record subsequent corrections as linked amendments/reversals. | Audit view shows original payload metadata, correction, actor/source, reason, and time; no financial history is silently overwritten. |
| FR-044 | P0 | The system shall identify usage records as reported by a named participating application. | Creator views show reporting application and event status; product copy does not imply independent internet-wide detection or independent verification of licensee business revenue. |
| FR-045 | P1 | The system should support usage-event batch ingestion with per-event validation and results. | A batch can contain valid and invalid events; each event gets an independent status and duplicate protection. |
| FR-046 | P1 | The system should support an event review/dispute workflow. | Creator or licensee can flag a record; flagged amounts are visibly marked and follow a defined hold/review policy without deleting the event. |

### F. Royalty calculation, ledger, and allocations

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-050 | P0 | The system shall calculate royalties from a validated event using the exact accepted licence version and a deterministic formula. | Replaying the same valid inputs and version yields the same result; the calculation stores formula/version and input values. |
| FR-051 | P0 | The MVP shall support a fixed fee per qualifying use; support for other models shall be enabled only when their basis is explicitly specified. | Fee, currency, qualifying event definition, and rounding rule are explicit in the licence; missing terms block activation. |
| FR-052 | P1 | The system should support upfront plus per-use and/or percentage-of-eligible-revenue royalties. | Each component has a separately defined basis, currency, calculation period, and handling for refunds/adjustments. |
| FR-053 | P1 | When multiple creators contribute, the system should allocate a pool using accepted allocation weights. | Weights total exactly 100% (or a documented normalized scheme); allocated amounts reconcile to the pool under deterministic currency rounding. |
| FR-054 | P0 | All financial amounts shall use decimal-safe monetary arithmetic and an explicit currency/rounding policy. | No binary floating-point is used for ledger amounts; calculations and rounding are reproducible. |
| FR-055 | P0 | The system shall maintain a double-entry or otherwise fully reconcilable append-only ledger for payable, paid, reversal, refund, fee, and adjustment entries. | Each posting has a stable ID, source event/payment, creator, currency, amount, and timestamp; corrections use compensating entries. |
| FR-056 | P0 | Every royalty line shall be explainable through its asset, licence/version, reported event, formula, allocation, ledger entries, and payment status. | Creator can inspect each link and download a statement; unavailable links show a clear reason. |
| FR-057 | P0 | The system shall prevent duplicate ledger postings for duplicate usage events or payment notifications. | Duplicate event/provider references do not create additional credits or debits. |
| FR-058 | P1 | Revenue-share calculations shall support defined reporting periods, corrections, refunds, and evidence/source fields for reported revenue. | A statement records reported basis and source; disagreement can be flagged. The platform labels licensee-reported revenue as such. |

### G. Creator dashboards and statements

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-060 | P0 | Creators shall view registered assets, published offers, active licences, reported use, pending royalties, paid amounts, and payout state. | Dashboard totals reconcile to ledger entries for the selected currency and date range. |
| FR-061 | P0 | Creators shall see a royalty lineage view from asset through licence, application, event, calculation, allocation, and settlement. | Each displayed amount links to its calculation and ledger record. |
| FR-062 | P0 | Licensees shall view only their application’s licence requests, active licences, submitted events, and payment status. | Cross-application data is not exposed. |
| FR-063 | P1 | The system should export periodic statements in a machine-readable format and a human-readable format. | Export includes period, currency, line-item basis, adjustments, and payment references. |

### H. Creator payouts and settlement

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-070 | P0 | The system shall calculate creator payable balances from ledger entries and distinguish payable from paid. | Balance equals posted credits less debits, holds, and completed payouts for that creator and currency. |
| FR-071 | P1 | The system should submit creator payouts through PayPal Payouts only after account access, eligibility, recipient data, and regional availability are confirmed. | Payout batch and item IDs are persisted; no payout is marked paid until provider-confirmed status. |
| FR-072 | P1 | The system shall reconcile asynchronous payment/payout notifications and provider status lookups. | Notifications are verified; state transitions are idempotent; failed/returned items remain visible and can be reconciled. |
| FR-073 | P0 | The platform shall support manual reconciliation and correction with maker/checker or equivalent authorization for material adjustments. | Reconciliation actions include reason, actor, source evidence, and ledger adjustment; unauthorized users cannot amend balances. |

### I. Administration and dispute handling

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-080 | P0 | Administrators shall review application status, failed events, payment mismatches, and flagged licence/usage records. | Admin actions are role-limited and create audit records. |
| FR-081 | P1 | The system should provide workflows for rights/ownership challenges, takedown requests, licence termination, and disputed usage. | Each case has a status, evidence references, deadlines/policy fields, and linked affected assets/licences/events. Exact policy requires legal/product approval. |
| FR-082 | P1 | The system should support licence expiry, revocation, and renewal while retaining the historical version and prior transactions. | Expired/revoked licences cannot authorize new events after the effective time; existing payable records remain traceable. |

## 5. Non-functional requirements

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| NFR-001 | P0 | **Security:** protect account sessions, application credentials, uploaded assets, payment references, and personal data. | TLS in transit; secrets managed outside source control; least-privilege access; security-sensitive actions audited. |
| NFR-002 | P0 | **API/webhook integrity:** authenticate app requests; verify payment-provider webhooks according to provider protocol; validate freshness/deduplicate where supported. | Invalid signatures are rejected; duplicate/replayed events have no duplicate side effect; secrets and full sensitive bodies are not logged. |
| NFR-003 | P0 | **Data integrity:** licence acceptance, usage validation, royalty calculation, and ledger posting shall be transactionally consistent. | Fault injection/retry scenarios do not produce an active unpaid licence or partial royalty allocation. |
| NFR-004 | P0 | **Auditability:** preserve actor, timestamp, source, version, and reason for licensing and financial changes. | A reviewer can reconstruct each royalty and settlement without relying on mutable UI summaries. |
| NFR-005 | P0 | **Privacy:** collect the minimum personal and campaign data needed for the workflow; restrict access and define retention/deletion policy before production. | Sensitive fields are access-controlled; operational logs exclude payment secrets and unnecessary personal data. Jurisdiction-specific retention requires counsel. |
| NFR-006 | P0 | **Availability/recovery:** protect the ledger and agreements through backups and tested restoration. | Recovery procedures define RPO/RTO targets before production; restore test demonstrates ledger and licence recovery. Numeric targets are pending deployment needs. |
| NFR-007 | P0 | **Performance:** API response and event processing targets shall be set for the pilot and measured. | Establish p95 latency and throughput targets after expected pilot volume is agreed; load tests report event acceptance and queue delay. |
| NFR-008 | P0 | **Accessibility/usability:** creator licensing and royalty views shall be understandable and usable by intended creators. | Conduct task-based usability review; support keyboard use and accessible labels/contrast for core flows. Detailed conformance target to be selected. |
| NFR-009 | P0 | **Correctness:** calculations shall be deterministic, explainable, and reproducible. | Golden test vectors cover per-use, revenue basis, allocation, rounding, refunds, and correction cases. |
| NFR-010 | P1 | **Interoperability:** API schemas shall be versioned and documented for participating applications. | Breaking changes have a versioning/deprecation policy; integration examples and error schemas are published. |
| NFR-011 | P1 | **Scale:** event ingestion should be queueable and horizontally scalable without changing financial semantics. | Load/duplicate/retry tests preserve event and ledger uniqueness. Target capacity is set for deployment. |

## 6. Core data entities

- **User / Organization / Role**
- **LicenseeApplication / Credential**
- **Asset / AssetVersion / ProvenanceRecord**
- **LicenceOffer / LicenceVersion / LicenceRequest / AcceptedAgreement**
- **PaymentOrder / PaymentCapture / Refund**
- **UsageEvent / EventCorrection / Dispute**
- **RoyaltyCalculation / Allocation / LedgerEntry**
- **PayoutBatch / PayoutItem / ProviderWebhook**
- **AuditRecord**

Relationships and retention rules must preserve accepted licence versions and financial lineage after an asset is archived or a licence expires.

## 7. High-level workflows

### Creator publishes an asset and licence

Register account → upload asset → calculate hash and store metadata → define structured licence offer → optionally use AI to draft terms → creator reviews and approves → publish version.

### Application requests permission and uses asset

Authenticate application → request asset/licence → validate requested use against structured terms → creator accepts → collect required upfront fee → server verifies payment → activate exact licence version → application reports event → validate and deduplicate event → calculate royalty → post ledger entries.

### Creator reviews earnings and receives settlement

Creator opens lineage view → inspects reported event and calculation → sees payable balance → payout is initiated only when configured/eligible → provider status is verified → ledger and settlement view updated.

## 8. Acceptance criteria for MVP release

1. A creator can register one supported asset and publish a versioned fixed-per-use licence.
2. A registered application can request that licence and cannot use it before creator acceptance and any required payment verification.
3. A valid qualifying usage event creates exactly one reproducible royalty posting.
4. Invalid, duplicate, expired, disallowed, and unauthenticated events do not create royalties.
5. Creator and licensee views show only authorized data and identify usage as application-reported.
6. A creator can trace a royalty from the asset and accepted licence through the usage event and ledger posting.
7. A payment webhook is verified and processed idempotently in sandbox before production use.
8. Administrators can reconcile a correction using a compensating entry without erasing original records.

## 9. Risks, constraints, and explicit non-goals

- The platform only observes participating apps' reported events; it cannot establish completeness of reporting by technical means alone.
- A cryptographic hash identifies matching bytes, not authorship or ownership.
- C2PA provenance can make certain claims and content bindings verifiable, but its presence/validity is not a legal ownership verdict and provenance can be absent.
- The platform cannot reliably infer causal contribution of an asset to model training or a generated output from ordinary usage logs.
- Licensee-reported revenue requires contractual obligations, audit rights, and dispute handling; the platform cannot independently know a licensee's total campaign revenue from an event payload alone.
- Copyright, licensing enforceability, privacy, payments, tax, and money-handling obligations vary by jurisdiction and require qualified legal/accounting review before launch.
- PayPal Payouts requires provider access/approval and has eligibility and regional constraints; it is not assumed available everywhere.

## 10. Decisions still required

1. Confirm the public product name: TraceRoyale or TraceCart.
2. Confirm first-release asset type and file-size/storage limits.
3. Identify the pilot participating application and its reporting/audit commitments.
4. Select the first compensation model and currency policy.
5. Decide whether the platform is only a ledger/orchestrator or ever holds funds.
6. Choose jurisdictions, hosting regions, privacy/retention policies, and legal review process.
7. Decide account/organization verification and rights-claim review policy.
8. Set expected event volume, availability, recovery, and performance targets.
9. Select an AI provider or keep the licence assistant provider-neutral.
10. Confirm which provenance formats must be supported in MVP.
