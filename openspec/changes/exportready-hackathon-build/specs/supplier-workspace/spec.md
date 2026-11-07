# Spec Delta

## Purpose

Gives a signed-in user a private workspace to describe a product for a buyer's requirement set,
upload and replace evidence documents, start an assessment and read the evidence report, all usable
without the assistant.

## ADDED Requirements

### Requirement: Workspace is private to the signed-in user
Every workspace page and action SHALL require a signed-in session and SHALL read or change only
products, documents, jobs and results owned by that user. The only exceptions are a listing the owner
publishes and a result the owner shares with one buyer, as defined in buyer-supplier-connections.

#### Scenario: Signed-out visitor
- **WHEN** a visitor without a session opens `/workspace`
- **THEN** they are sent to sign-in

#### Scenario: Another user's product
- **WHEN** a signed-in user requests a product ID owned by someone else
- **THEN** the app responds as if the product does not exist

### Requirement: Supplier profile is declared, not evidenced
At onboarding a user SHALL be able to enter a supplier profile (company name, country, product
category, manufacturing capabilities, target export market) for the product. The workspace and report
SHALL label these values "declared by supplier", and the assessment SHALL NOT use them as evidence for
any requirement.

#### Scenario: Declared capability does not support a finding
- **WHEN** the profile declares "traceability by resin batch" and no document contains a traceability record
- **THEN** R4 is still MISSING and the profile shows the capability as declared by the supplier

### Requirement: Product draft records value origin
A user SHALL be able to create a product draft for a requirement set and edit its supplier, part
number, revision, material and packaging fields. Each stored field value SHALL record whether it was
entered by the user, by the assistant or extracted from a document.

#### Scenario: Assistant fills a field
- **WHEN** the assistant sets the part number to CAP-104
- **THEN** the field shows CAP-104 marked as filled by the assistant and stays editable

### Requirement: Uploads are validated and batched
The workspace SHALL accept PDF files up to 4 MB each, at most five active PDFs per product, and at most
two JPEG or PNG photos up to 4 MB each as attachments that are not used as evidence. Files SHALL join a
pending batch, and an assessment SHALL start only when the user finalises the batch with one explicit
"Upload and assess" action.

#### Scenario: Oversized file
- **WHEN** a user adds a 5 MB PDF
- **THEN** it is rejected with a message naming the 4 MB limit and the batch is unchanged

#### Scenario: Files arrive one by one
- **WHEN** a user adds four PDFs one after another and then presses "Upload and assess"
- **THEN** exactly one assessment is started, covering all four

### Requirement: A document can be explicitly replaced
A user SHALL be able to replace one active document with a new file. The replaced document SHALL become
inactive but remain stored, and the next assessment SHALL use the new active set.

#### Scenario: Replace revision A with revision B
- **WHEN** the user replaces `03_CAP104_Inspection_RevA.pdf` with `05_CAP104_Inspection_RevB.pdf` and finalises
- **THEN** the active set holds documents 01, 02, 04 and 05 and a new assessment starts

### Requirement: Report shows findings with their sources
The report view SHALL list each requirement with its status, evidence type, reason and next action,
SHALL show each citation's filename, page and exact quote, and SHALL mark processing incomplete when it
was. It SHALL state that the report is not a certification.

#### Scenario: Open a finding's source
- **WHEN** the user opens the R3 finding
- **THEN** they see the revision-A report's filename, page 1 and the exact quoted passage

### Requirement: Report summarises evidence coverage by dimension
The report SHALL show, for each readiness dimension, how many of its requirements are DOCUMENTED and
how many are open (any other status). It SHALL NOT show a percentage, score, rating or overall
readiness verdict.

#### Scenario: Baseline dimension summary
- **WHEN** the baseline demo report is shown
- **THEN** Product and material shows 1 documented and 0 open, Quality 0 documented and 2 open, Traceability 0 documented and 1 open, Packaging and logistics 1 documented and 0 open

### Requirement: Report gives an improvement action plan
The report SHALL list one action per unresolved finding, ordered by requirement, each naming what to
provide and why, taken from that finding's next action. It SHALL offer a document-request draft that
the user can copy, listing the same items. The draft SHALL NOT be sent by the app.

#### Scenario: Baseline action plan
- **WHEN** the baseline demo report is shown
- **THEN** the action plan lists three actions, for R2, R3 and R4, and the copyable draft names the same three documents

#### Scenario: After correction
- **WHEN** the corrected report is shown
- **THEN** the action plan lists two actions, for R2 and R4

### Requirement: Progress reflects real job state
The workspace SHALL show the current job's actual stage from stored state, refreshed without a page
reload, and SHALL load the stored result when the user returns to the product later.

#### Scenario: Return after completion
- **WHEN** a user reloads the product page after its job completed
- **THEN** the stored report is shown without starting a new assessment
