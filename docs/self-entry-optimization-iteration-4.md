# Self-Entry Optimization Iteration 4

## Scope

This iteration focuses on the custom trade-decision form. Unlike the generic module pages, it still used hard-coded demo IDs and accepted arbitrary relationship IDs from the client.

## Reflection

Trade decisions are the highest-audit-value records in the system. If the user can submit a decision linked to a non-existing security, thesis, or source, later transaction execution, exception review, and export all become unreliable.

## Problems

- The create-decision form defaults to demo IDs.
- `标的 ID`, `论点 ID`, and `信息来源 ID` are typed manually.
- The service only validates shape with Zod; it does not validate that referenced records exist.
- A thesis can be attached to a decision for a different security.

## Better Interaction

- Load selectable securities, theses, and sources from the database.
- Default the security to the first available security, not a hard-coded demo ID.
- Default the thesis to a thesis that belongs to the selected security when available.
- Use a compact source checklist instead of comma-separated source IDs.
- Keep numeric/risk fields editable because they are decision assumptions, not master-data references.

## Backend Requirements

- Trade-decision creation must reject:
  - unknown security IDs
  - unknown thesis IDs
  - thesis/security mismatches
  - unknown source IDs
- Empty thesis and empty source list remain valid.

## UI Requirements

- Security and thesis fields render as selectors.
- Sources render as selectable existing source rows.
- No hard-coded demo business IDs remain in the client default form.

## Acceptance Tests

- Integration: trade decision creation rejects unknown security, unknown thesis, mismatched thesis, and unknown source.
- E2E: trade-decision creation dialog renders security/thesis selectors and source checkboxes.

## Iteration Self-Review

This closes the biggest remaining data-integrity gap in the transaction loop. The next refinement would be context filtering: after selecting a security, only show matching theses and sources by default while still allowing explicit cross-security evidence when needed.
