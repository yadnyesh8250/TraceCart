# TraceRoyale / TraceCart — Problem Statement

**Source:** User-provided TraceRoyale concept brief, received 2026-11-04.  
**Repository name:** TraceCart  
**Product name in source brief:** TraceRoyale  
**Naming decision:** Pending owner confirmation. This document preserves both names rather than silently choosing one.

## Problem

Creators who license images, audio, video, illustrations, and other works to AI applications often lack a consistent way to define permissions, see qualifying uses reported by licensees, understand royalty calculations, and reconcile payments. AI application developers and creative agencies need a structured process for requesting permission and recording the uses they are authorized to make.

Licences, usage reporting, royalty calculations, and payments can be fragmented across agreements and systems. This makes it difficult for creators and licensees to see which terms applied, what activity was reported, how a payable amount was calculated, and whether payment settled.

## Proposed solution

A platform for creators and participating licensees that connects:

1. Asset registration and identifiers.
2. Versioned creator-defined licence terms.
3. Licensee application integration for licence requests and usage-event reporting.
4. Deterministic royalty calculation and allocation.
5. Auditable relationships between assets, licences, reports, calculations, and settlement records.
6. Supported payment checkout and payout orchestration.

AI may help structure creator-authored licence terms and explain system records. A creator must review and approve terms. Deterministic application rules govern permissions and financial calculations.

## Explicit boundaries from the brief

- Usage visibility covers participating applications and events those applications report. The system must not claim universal internet-wide discovery.
- A hash identifies file bytes and can help detect an exact-file change; it does not prove copyright ownership.
- The platform does not independently decide copyright ownership.
- The platform does not infer or claim that an asset causally influenced a model's training or a generated output.
- AI does not invent a creator's fee, royalty rate, or legal permission.
- Legal enforceability, rights disputes, regional eligibility, and payment-provider approval require further review; this product brief is not a legal opinion.
