# Spec Delta

## Purpose

Connects buyers and suppliers in both directions. A buyer posts a sourcing request or asks a listed
supplier for evidence. A supplier answers with a new or existing product and its documents, and
shares the resulting evidence report with that one buyer. Documents and reports never become public.

## ADDED Requirements

### Requirement: Buyers post sourcing requests
A signed-in user SHALL be able to create a buyer request with organisation name, title, part number,
the requirement set to assess against and a message of at most 1000 characters. An open request SHALL
appear on the request board, which every signed-in user can see. The board SHALL never show the
buyer's email address.

#### Scenario: Neckar posts a request
- **WHEN** the buyer account creates "Cover cap CAP-104 rev B" for Neckar Maschinenbau GmbH with the `neckar-cap-104` checklist
- **THEN** the request appears on the board with organisation, part number and checklist, and without the buyer's email

### Requirement: Suppliers publish product listings
A supplier SHALL be able to list one of their products in the supplier directory, which every signed-in
user can see. A listing SHALL show only the product name, part number and the declared supplier
profile. It SHALL NOT show documents, findings or reports.

#### Scenario: Listed product shows no evidence
- **WHEN** a buyer opens Lotus Mould's listed CAP-104 product in the directory
- **THEN** they see the declared profile and part number, and no document, finding or report

### Requirement: Contact in either direction creates one connection
A supplier SHALL be able to respond to a board request with an existing product or a new one. A buyer
SHALL be able to request evidence on a listed product. Either action SHALL create one connection between
that request and that product, recording who initiated it and an optional message. The database SHALL
reject a second connection for the same request and product. A user SHALL NOT connect their own product
to their own request.

#### Scenario: Supplier responds to a request
- **WHEN** the supplier responds to Neckar's request with their existing CAP-104 product
- **THEN** a connection initiated by the supplier exists, and the buyer sees it as "In progress"

#### Scenario: Buyer contacts a listed supplier
- **WHEN** the buyer presses "Request evidence" on Lotus Mould's listing
- **THEN** a direct request and a connection initiated by the buyer exist, and the supplier sees it in "Requests for you"

#### Scenario: Duplicate connection
- **WHEN** a second connection for the same request and product is inserted
- **THEN** the database rejects it

### Requirement: Reports are shared explicitly, one buyer at a time
A supplier SHALL be able to share a completed assessment result of a connected product with that
connection's buyer. The database SHALL reject a connection marked shared without a result. The buyer SHALL
see exactly the shared result: findings, citations with quotes, the dimension summary and the action
plan. The buyer SHALL NOT see later results until they are shared again, and SHALL NOT download the
original documents.

#### Scenario: Buyer opens a shared report
- **WHEN** the supplier shares the baseline result on the Neckar connection
- **THEN** the buyer sees R1-R5 with citations and the three open actions, and no download link for the documents

#### Scenario: Re-share after correction
- **WHEN** the supplier re-assesses with the revision-B report and shares again
- **THEN** the buyer sees the new result, with R3 now DOCUMENTED

### Requirement: Shared data stays scoped to the connection
Only the connection's buyer and the product's owner SHALL see a connection, its messages and its shared
result. Any other signed-in user SHALL get "not found".

#### Scenario: Third user
- **WHEN** a third signed-in user requests a connection's shared report by ID
- **THEN** the response is 404

### Requirement: The other party is notified
Creating a buyer-initiated connection SHALL notify the supplier, and sharing a report SHALL notify the
buyer. Each notice SHALL appear in the recipient's inbox and SHALL be emailed once to the recipient's own
account address. The notice SHALL NOT reveal the sender's email address. An email failure SHALL NOT undo
the connection or the share.

#### Scenario: Share notifies the buyer
- **WHEN** the supplier shares a report with Neckar
- **THEN** the buyer's inbox shows "Lotus Mould shared an evidence report", and one email goes to the buyer's account address
