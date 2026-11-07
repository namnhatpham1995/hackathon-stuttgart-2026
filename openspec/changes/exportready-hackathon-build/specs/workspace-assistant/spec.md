# Spec Delta

## Purpose

Lets a signed-in user drive the workspace in plain language (open views, fill the draft, request
uploads, start and explain assessments) through the same approved actions as the manual controls.

## ADDED Requirements

### Requirement: The assistant can only call approved actions
The assistant SHALL be limited to these actions: read workflow state, open the product, uploads or
report view, update allowed product draft fields, show the upload card, start an assessment, read
assessment status, show a report, request a replacement for an identified active document, and the
site and connection actions below. It SHALL have no arbitrary navigation, script execution or database
access.

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

### Requirement: The assistant is available on every signed-in page
The assistant SHALL be available on every signed-in page: the supplier workspace, the buyer
workspace, connections and the workspace chooser. It SHALL accept typed text without an open product
and know which page the user is on, so it can explain how to use the site from there. An action that
needs a product SHALL ask the user to open one when none is open.

#### Scenario: Asking how to add a product from the products list
- **WHEN** a signed-in user with no product open asks how to add a product
- **THEN** the assistant explains the New product steps and can open that page, and no product action runs

#### Scenario: Buyer asks from the buyer workspace
- **WHEN** the user on the buyer's Find products page asks how to get evidence for CAP-104
- **THEN** the assistant answers from the buyer side of the site and can search the catalog for CAP-104

### Requirement: Site and connection actions are limited
Besides the product actions, the assistant SHALL be limited to these actions:
- **Site:** list the user's own products, and open a page from a fixed list of the site's pages.
- **Connections, at once:** search the catalog, list the user's own requests, read the inbox, and close
  the user's own request.
- **Connections, only as a confirmation for the user:** prepare an evidence request, a board request,
  a response to a request, or a result share.

#### Scenario: Navigation outside the fixed list
- **WHEN** the model asks to open a URL that is not one of the site's listed pages
- **THEN** the action is rejected and no navigation happens

#### Scenario: Closing another user's request
- **WHEN** the model asks to close a request owned by another user
- **THEN** the action fails as not found and the request stays open

### Requirement: The conversation survives page changes
The conversation SHALL stay visible when the user moves between pages, products and workspaces, and
after a reload in the same browser tab. It SHALL be stored per signed-in user, SHALL NOT be shown to
another account in the same browser, and SHALL be cleared on sign-out. The database stays the source
of truth for products, documents, requests and results.

#### Scenario: Moving from a product to the buyer workspace
- **WHEN** the user talks to the assistant on a product page and then opens the buyer workspace
- **THEN** the same conversation is shown there and can continue

#### Scenario: Sign-out
- **WHEN** the user signs out and another account signs in on the same browser
- **THEN** the assistant shows no earlier conversation

### Requirement: Steps that reach another company need the user's confirmation
An evidence request, a board request, a response to a request and a result share SHALL NOT be sent by
the assistant itself. The assistant SHALL show a confirmation card naming what will be sent and to
whom. The step SHALL run only when the user presses the card's send button, through the same action
as the manual control.

#### Scenario: Assistant prepares an evidence request
- **WHEN** the user asks the assistant to request evidence for a listed product
- **THEN** a confirmation card appears, no request or notification exists yet, and pressing Send creates exactly one request

#### Scenario: User cancels
- **WHEN** the user presses Cancel on a confirmation card
- **THEN** nothing is sent and the assistant says so
