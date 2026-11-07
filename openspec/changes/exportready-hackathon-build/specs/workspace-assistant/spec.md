# Spec Delta

## Purpose

Lets a signed-in user drive the workspace in plain language (open views, fill the draft, request
uploads, start and explain assessments) through the same approved actions as the manual controls.

## ADDED Requirements

### Requirement: The assistant can only call approved actions
The assistant SHALL be limited to these actions: read workflow state, open the product, uploads or
report view, update allowed product draft fields, show the upload card, start an assessment, read
assessment status, show a report, and request a replacement for an identified active document. It SHALL
have no arbitrary navigation, script execution or database access.

#### Scenario: Unsupported request
- **WHEN** the user asks the assistant to email the buyer directly
- **THEN** the assistant says it cannot do that and calls no action

### Requirement: Actions run with the user's own authority
Every assistant action SHALL run with the signed-in session's identity and the same validation as the
manual controls. A user, product or job ID supplied in the model's arguments SHALL NOT grant access to
another user's data.

#### Scenario: Model supplies a foreign product ID
- **WHEN** the model calls "show report" with a product ID owned by another user
- **THEN** the action fails as not found and the assistant reports that it could not open it

### Requirement: Files are always chosen by the user
The assistant SHALL request files only by showing the upload card and waiting for the user's own
selection and "Upload and assess" action. It SHALL NOT start an assessment per arriving file.

#### Scenario: Upload request
- **WHEN** the user says "I want to submit my documents for this buyer"
- **THEN** the upload card appears and no assessment starts until the user finalises the batch

### Requirement: Replies report actual outcomes
The assistant SHALL describe progress and results only from action results and stored state, and SHALL
bound tool-call rounds per message. A tool failure SHALL be explained with an applicable recovery step.

#### Scenario: Asking why R3 failed
- **WHEN** the user asks why R3 failed after the baseline assessment
- **THEN** the assistant answers from the stored finding, citing the revision-A report and its quote, and offers to request a replacement

#### Scenario: Round limit
- **WHEN** the model keeps requesting actions beyond the round limit
- **THEN** the assistant stops calling actions and tells the user what was done

### Requirement: Manual controls and text input always remain usable
The workspace SHALL stay fully usable without the assistant, and the assistant SHALL always accept typed
text. Spoken replies, when enabled, SHALL be optional and SHALL fall back to text when audio fails.

#### Scenario: Audio unavailable
- **WHEN** speech output fails or is turned off
- **THEN** the reply is shown as text and the conversation continues
