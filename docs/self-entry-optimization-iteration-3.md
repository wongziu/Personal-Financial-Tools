# Self-Entry Optimization Iteration 3

## Scope

This iteration focuses on remaining relationship fields that still behave like plain text. The app already supports account/security references, but several downstream pages still ask the user to type business IDs manually.

## Page-by-Page Reflection

### Transactions

Current pain:

- `论点 ID`, `决策单 ID`, and `更正关联 ID` are plain inputs.
- Users must remember exact IDs and can accidentally save broken references.

Better interaction:

- These fields should select existing theses, decisions, and prior transactions.
- The server should reject non-existing IDs when a relationship is provided.

### Sources

Current pain:

- `关联论点` is a text input even though theses are managed inside the system.

Better interaction:

- Use an existing-thesis selector. Leaving it blank remains allowed because not every source belongs to a formal thesis.

### Review Events

Current pain:

- `决策单 ID` is typed manually when a review leads to a decision.

Better interaction:

- Use an existing-decision selector.

### Exceptions

Current pain:

- `决策单 ID` and `交易 ID` are manually typed, despite being audit links.

Better interaction:

- Use existing-decision and existing-transaction selectors.

## Backend Requirements

- Add reference metadata for optional relationship fields:
  - transactions: thesis, decision, correction transaction
  - sources: related thesis
  - review events: linked decision
  - exceptions: linked decision and transaction
- Reuse the existing `validateReferenceFields` server check so invalid IDs cannot be persisted through API calls.
- Keep the database schema unchanged; this is a form and validation improvement.

## UI Requirements

- Referenced IDs render as selectors with human-readable labels.
- Blank optional references remain possible.
- Table cells continue to display the saved business ID; selector labels are for entry efficiency.

## Acceptance Tests

- Integration: inserting a transaction with an unknown thesis ID is rejected, while an existing thesis ID is accepted.
- Integration: inserting a source with an unknown related thesis ID is rejected.
- E2E: transaction form renders thesis/decision/correction fields as selectors, not text inputs.
- E2E: source form renders related thesis as a selector.

## Iteration Self-Review

This closes a class of data-entry mistakes rather than one form-specific inconvenience. It does not yet solve filtered selectors by selected security or multi-select source linking in the custom trade-decision form. Those are good candidates for a later workflow-specific iteration.
