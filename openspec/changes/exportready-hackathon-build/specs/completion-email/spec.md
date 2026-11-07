# Spec Delta

## Purpose

Tells the user by email that a stored assessment report is ready, using a fixed template and the
account's own address, without letting email delivery affect the report.

## ADDED Requirements

### Requirement: One email per completed job
When a job becomes COMPLETED, the system SHALL record one completion-notification per job and recipient,
and the database SHALL reject a second notification for the same job, recipient and type.

#### Scenario: Completion triggers one notification
- **WHEN** a job is completed
- **THEN** exactly one notification record exists for it

#### Scenario: Retry does not duplicate
- **WHEN** the notification step runs again for the same job
- **THEN** no second notification record or email is created

### Requirement: Email goes to the account address with a fixed template
The email SHALL be sent to the signed-in account's email address, never to an address found in a
document, using a fixed subject and body that state how many issues remain and link to the signed-in
report page. It SHALL NOT attach documents.

#### Scenario: Demo completion email
- **WHEN** the baseline demo job completes for a user with address `team@example.test`
- **THEN** the email to `team@example.test` says three documentation issues remain and links to that product's report

### Requirement: Email failure never affects the report
A failed or timed-out send SHALL be recorded on the notification with its error, and the job and report
SHALL stay COMPLETED and viewable. A successful send SHALL record the provider message ID.

#### Scenario: Provider error
- **WHEN** the email provider returns an error
- **THEN** the notification is marked failed with the error and the report still loads
