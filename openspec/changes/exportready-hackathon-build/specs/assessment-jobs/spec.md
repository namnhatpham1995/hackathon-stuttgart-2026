# Spec Delta

## Purpose

Runs each assessment as a stored job with a real lifecycle, so progress, completion and failure come
from the database rather than from a chat or an open browser tab.

## ADDED Requirements

### Requirement: Starting is idempotent per document snapshot
Starting an assessment SHALL create a job keyed by product, requirement set version and the hash of the
finalised active document set. Starting again with the same key SHALL return the existing job instead of
creating another, and the database SHALL reject a second job with the same key.

#### Scenario: Double start
- **WHEN** the start action is called twice for the same finalised snapshot
- **THEN** both calls return the same job ID and only one job row exists

#### Scenario: Direct duplicate insert
- **WHEN** a second job row with an existing key is inserted directly
- **THEN** the database rejects the insert

### Requirement: Job states follow the defined lifecycle
A job SHALL move only through QUEUED, PROCESSING, then COMPLETED or NEEDS_ATTENTION, and SHALL record the
current stage (extracting text, extracting facts, checking rules, saving). A job SHALL be marked
COMPLETED only after its result is stored.

#### Scenario: Result before completion
- **WHEN** a job finishes processing
- **THEN** its result row exists before its status reads COMPLETED

#### Scenario: Processing failure
- **WHEN** the model call fails after the allowed retries
- **THEN** the job is NEEDS_ATTENTION with an error message the user can act on, and no result is shown as complete

### Requirement: Job status is readable only by its owner
Reading a job's status or result SHALL require the session of the user who owns the job's product.

#### Scenario: Other user's job ID
- **WHEN** a signed-in user requests the status of a job owned by another user
- **THEN** the response is 404 and reveals nothing about the job

### Requirement: A claimed job is processed once
A job SHALL be claimed for processing by a single atomic state change from QUEUED to PROCESSING, so two
concurrent runners cannot both process it.

#### Scenario: Two runners
- **WHEN** two runners try to claim the same queued job at the same time
- **THEN** exactly one of them processes it
