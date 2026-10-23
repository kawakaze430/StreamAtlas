# Mandatory public-launch gates (all unapproved)

This is a checklist, **not an approval form**, certification, or legal opinion.
The codebase stays a synthetic-media test prototype until *independent* qualified
reviewers and actual partner integrations have been completed.

| Gate | Acceptance evidence (outside code) | State |
|---|---|---|
| Jurisdiction | Qualified legal advice, documented service classification and restrictions in every target region | NOT DONE |
| Provider policies | AWS, CDN, domain, payment and email providers confirm intended lawful usage is supported | NOT DONE |
| Viewer age assurance | Signed provider contract + tested HEAA, strong bypass resistance, region-appropriate recordkeeping, privacy impact review | NOT DONE |
| Participant adulthood | Independent verification of every depicted participant + protected proof records | NOT DONE |
| Consent and rights | Granular distribution permissions, license chain, revocation mechanism, retention and audit process | NOT DONE |
| Upload safety | Underage/non-consensual media prevention, quarantine, trained urgent review, notice to authorities where required | NOT DONE |
| Copyright | Lawful takedown notice handling, identity checks, counter-notices, repeat infringer policy, response timelines | NOT DONE |
| Appeals | Fair review, access control, evidence integrity, and appeal/audit procedures tested operationally | NOT DONE |
| Data protection | Privacy notice, retention/deletion policy, lawful basis, minimum sensitive data, international transfers, DPA where required | NOT DONE |
| Pen test / dependency review | Independent web/infra attack simulation, vulnerabilities remediated and retested | NOT DONE |
| Worker isolation | Network isolation, resource limits, hardened codecs, scanning, host-escape testing, capacity budgets | NOT DONE |
| Reliability | Cloud deploy, staging load test, alerts/on-call rotations, RPO/RTO and offsite restore drill | NOT DONE |
| Domain & billing | DNS and TLS verified, bills guarded, incident escalation and infra ownership defined | NOT DONE |

## Implemented code scaffolding is NOT a verified control

- `signed_verification_events` / `age_assurance_receipts` and the webhook route
  accept signed provider-shaped messages but cannot prove vendor quality or
  identity-document validity, and do not grant viewer access.
- `review_evidence` contains textual identifiers; these are not independent
  human/legal proof of consent, adulthood, or licensing.
- `compliance_cases`, `content_holds`, `compliance_case_events` and appeals
  preserve decisions locally, but not regulatory process effectiveness.
- The CDN signer creates authentic-looking signed-cookie values but does NOT
  implement viewer entitlement, age eligibility, cache invalidation or a live
  CloudFront-backed streaming route. Never attach it to an unrestricted API.

## Launch gate policy

Do not change `SA_PUBLIC_CONTENT_MODE` to 1 expecting to activate the site;
startup deliberately fails. Before considering removal of this deliberate block,
engage qualified counsel and independent auditors, integrate approved providers,
perform actual end-to-end tests, document compliance and seek hosting approval.
