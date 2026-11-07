# Spec Delta

## Purpose

Let a person sign in to ExportReady with an emailed link, creating the account the first time
the link is opened, without removing email-and-password sign-in.

## ADDED Requirements

### Requirement: Requesting a link emails that address
The system SHALL send one plain-text email to the submitted address through the existing Brevo
sender. The subject SHALL be `Your ExportReady sign-in link`. The body SHALL contain the verify
URL whose origin is `BETTER_AUTH_URL`. The Brevo API key SHALL stay on the server.

#### Scenario: Link is addressed to the submitted email
- **WHEN** a visitor submits `supplier@example.com` for a sign-in link
- **THEN** one email is sent to `supplier@example.com` with subject `Your ExportReady sign-in link` and a verify URL on `BETTER_AUTH_URL`

#### Scenario: Missing Brevo key
- **WHEN** `BREVO_API_KEY` is not set and a visitor requests a link
- **THEN** the request fails with an error that names `BREVO_API_KEY` and no email is sent

### Requirement: The first verified click creates the account
Opening a valid link for an unknown email SHALL create one user with that email,
`emailVerified` true, and a session, then redirect to `/workspace`. A second use of the same
link SHALL NOT create another user. An email that already has a user SHALL sign that same user
in and SHALL NOT insert a second user. Email-and-password sign-in SHALL keep working for a
user who has not opened a magic link. Better Auth removes a password that was set before the
email was verified once that person opens a link; this change does not add a workaround.

#### Scenario: First click
- **WHEN** a new address opens a valid magic link
- **THEN** one user exists for that email, the email is verified, and the browser is sent to `/workspace`

#### Scenario: Existing password user
- **WHEN** an address that already signed up with a password opens a valid magic link
- **THEN** the same user row is signed in and no second user exists

### Requirement: Sign-in page offers the link
The sign-in page SHALL show an email field and a control labelled `Email me a sign-in link`.
After a successful request it SHALL show a check-your-inbox state. The sign-up page SHALL NOT
show that form.

#### Scenario: Sign-in page
- **WHEN** a signed-out visitor opens the sign-in page
- **THEN** they see `Email me a sign-in link`

#### Scenario: After a successful request
- **WHEN** the link request succeeds
- **THEN** the page tells them to check their inbox
