# R3 Intelligent Composer

## OpenAPI Contract · v1.0

|Field       |Value                        |
|------------|-----------------------------|
|Spec Version|OpenAPI 3.1.0                |
|Base URL    |`https://api.r3native.io/api`|
|Auth        |Bearer JWT (`r3_token`)      |
|Content Type|`application/json`           |
|Last Updated|2026-05-31                   |


> **Note on transport:** All endpoints below are consumed via **tRPC** internally (HTTP + JSON). This document describes the equivalent REST semantics for documentation, external integration, and DAW plugin use. The tRPC procedure names are noted beside each endpoint.

-----

## Table of Contents

1. [Authentication](#1-authentication)
1. [Composer Endpoints](#2-composer-endpoints)
1. [Projects Endpoints](#3-projects-endpoints)
1. [Exports Endpoints](#4-exports-endpoints)
1. [Copilot Endpoints](#5-copilot-endpoints)
1. [Shared Schemas](#6-shared-schemas)
1. [Error Schemas](#7-error-schemas)
1. [Full YAML Spec](#8-full-yaml-spec)

-----

## 1. Authentication

All protected endpoints require a JWT in the Authorization header:

```
Authorization: Bearer <r3_token>
```

Tokens are obtained via the existing auth endpoints. Tokens expire after 7 days. Refresh using the `POST /auth/refresh` endpoint (outside Composer scope; see main API docs).

### Auth Errors

|Scenario                      |Status|Code          |
|------------------------------|------|--------------|
|Missing token                 |401   |`UNAUTHORIZED`|
|Expired token                 |401   |`UNAUTHORIZED`|
|Valid token, insufficient role|403   |`FORBIDDEN`   |

-----

## 2. Composer Endpoints

### `POST /composer/generate`

**tRPC:** `composer.generate`

Generate a full composition from a natural language prompt.

**Rate Limit:** 10 requests/minute per user

#### Request Body

```json
{
  "prompt":        "string (3–500 chars, required)",
  "genre":         "Genre (required)",
  "mood":          "Mood (required)",
  "bpm":           "integer (60–200, optional)",
  "key":           "Key (optional)",
  "timeSignature": "TimeSignature (optional, default: '4/4')"
}
```

**Example Request:**

```json
{
  "prompt": "Dark trap beat with an eerie minor melody and heavy 808 bass",
  "genre": "trap",
  "mood": "dark",
  "bpm": 140,
  "key": "Cm"
}
```

#### Response `200 OK`

```json
{
  "compositionId": "uuid",
  "composition": { "$ref": "#/components/schemas/Composition" },
  "lowConfidence": false,
  "generationMs":  4230
}
```

**Example Response:**

```json
{
  "compositionId": "f3e1c2d4-1234-5678-abcd-ef0123456789",
  "lowConfidence": false,
  "generationMs": 4230,
  "composition": {
    "id": "f3e1c2d4-1234-5678-abcd-ef0123456789",
    "key": "Cm",
    "bpm": 140,
    "timeSignature": "4/4",
    "harmony": {
      "key": "Cm",
      "bpm": 140,
      "timeSignature": "4/4",
      "chords": [
        {
          "position": 1,
          "symbol": "Cm",
          "romanNumeral": "i",
          "duration": 4,
          "midiNotes": [60, 63, 67]
        },
        {
          "position": 5,
          "symbol": "Ab",
          "romanNumeral": "VI",
          "duration": 4,
          "midiNotes": [56, 60, 63]
        },
        {
          "position": 9,
          "symbol": "Bb",
          "romanNumeral": "VII",
          "duration": 4,
          "midiNotes": [58, 62, 65]
        },
        {
          "position": 13,
          "symbol": "Gm",
          "romanNumeral": "v",
          "duration": 4,
          "midiNotes": [55, 58, 62]
        }
      ]
    },
    "melodies": [
      {
        "type": "lead",
        "phraseCount": 4,
        "notes": [
          { "pitch": 72, "startBeat": 1, "duration": 0.5, "velocity": 90 },
          { "pitch": 70, "startBeat": 1.5, "duration": 0.5, "velocity": 80 }
        ]
      },
      {
        "type": "hook",
        "phraseCount": 2,
        "notes": [
          { "pitch": 75, "startBeat": 1, "duration": 1.0, "velocity": 95 }
        ]
      }
    ],
    "drums": {
      "bpm": 140,
      "bars": 2,
      "steps": 16,
      "swing": 0.0,
      "tracks": {
        "kick":  [true,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false],
        "snare": [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],
        "hihat": [true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false]
      }
    }
  }
}
```

#### Response `400 Bad Request`

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": {
      "prompt": "Must be at least 3 characters",
      "bpm": "Must be between 60 and 200"
    }
  }
}
```

#### Response `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Generation limit reached. Try again in 45 seconds.",
    "details": { "retryAfterSeconds": 45 }
  }
}
```

-----

### `POST /composer/regenerate`

**tRPC:** `composer.regenerate`

Re-run the generation pipeline for an existing composition, optionally locking components.

**Rate Limit:** 10 requests/minute per user

#### Request Body

```json
{
  "compositionId": "uuid (required)",
  "keepHarmony":   "boolean (optional, default: false)",
  "keepMelody":    "boolean (optional, default: false)",
  "keepRhythm":    "boolean (optional, default: false)"
}
```

**Example Request:**

```json
{
  "compositionId": "f3e1c2d4-1234-5678-abcd-ef0123456789",
  "keepHarmony": true,
  "keepRhythm": false
}
```

#### Response `200 OK`

Same schema as `POST /composer/generate`.

-----

### `GET /composer/compositions/:id`

**tRPC:** `composer.getComposition`

Retrieve a previously generated composition by ID.

#### Path Parameters

|Parameter|Type|Description   |
|---------|----|--------------|
|`id`     |UUID|Composition ID|

#### Response `200 OK`

```json
{
  "composition": { "$ref": "#/components/schemas/Composition" }
}
```

#### Response `404 Not Found`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Composition not found or does not belong to this user."
  }
}
```

-----

## 3. Projects Endpoints

### `GET /projects`

**tRPC:** `projects.list`

Return a paginated list of projects for the authenticated user.

#### Query Parameters

|Parameter |Type   |Default    |Description                     |
|----------|-------|-----------|--------------------------------|
|`page`    |integer|1          |Page number (1-indexed)         |
|`pageSize`|integer|20         |Items per page (max 100)        |
|`sort`    |enum   |`updatedAt`|`createdAt`, `updatedAt`, `name`|
|`order`   |enum   |`desc`     |`asc`, `desc`                   |

#### Response `200 OK`

```json
{
  "projects": [
    { "$ref": "#/components/schemas/ProjectSummary" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

-----

### `POST /projects`

**tRPC:** `projects.create`

Create a new project.

#### Request Body

```json
{
  "name":          "string (1–100 chars, required)",
  "tags":          "string[] (max 10 items, each max 30 chars, optional)",
  "compositionId": "uuid (optional — attach an existing composition on creation)"
}
```

**Example Request:**

```json
{
  "name": "Dark Trap Vol. 1",
  "tags": ["trap", "dark", "140bpm"]
}
```

#### Response `201 Created`

```json
{
  "projectId": "uuid",
  "project":   { "$ref": "#/components/schemas/Project" }
}
```

-----

### `GET /projects/:id`

**tRPC:** `projects.load`

Load a project with its latest composition.

#### Response `200 OK`

```json
{
  "project":             { "$ref": "#/components/schemas/Project" },
  "latestComposition":   { "$ref": "#/components/schemas/Composition" }
}
```

-----

### `PATCH /projects/:id`

**tRPC:** `projects.update`

Update project metadata (name, tags). Does not modify composition data.

#### Request Body

```json
{
  "name": "string (optional)",
  "tags": "string[] (optional)"
}
```

#### Response `200 OK`

```json
{
  "project": { "$ref": "#/components/schemas/Project" }
}
```

-----

### `DELETE /projects/:id`

**tRPC:** `projects.delete`

Soft-delete a project. Recoverable within 30 days.

#### Response `200 OK`

```json
{
  "projectId": "uuid",
  "deletedAt": "2026-05-31T14:22:00Z",
  "recoveryDeadline": "2026-06-30T14:22:00Z"
}
```

-----

### `POST /projects/:id/save`

**tRPC:** `projects.save`

Save the current composition state as a new version snapshot.

#### Request Body

```json
{
  "compositionId": "uuid (required)",
  "label":         "string (optional — version label, max 50 chars)"
}
```

#### Response `200 OK`

```json
{
  "versionId":     "uuid",
  "versionNumber": 4,
  "savedAt":       "2026-05-31T14:22:00Z"
}
```

-----

### `GET /projects/:id/versions`

**tRPC:** `projects.versions`

List all saved version snapshots for a project.

#### Response `200 OK`

```json
{
  "versions": [
    {
      "versionId":     "uuid",
      "versionNumber": 4,
      "label":         "Added hook melody",
      "savedAt":       "2026-05-31T14:22:00Z",
      "compositionId": "uuid"
    }
  ]
}
```

-----

## 4. Exports Endpoints

### `POST /exports/midi`

**tRPC:** `exports.exportMidi`

Generate and return a MIDI export for a composition.

#### Request Body

```json
{
  "compositionId": "uuid (required)",
  "exportType":    "melody | chords | drums | full (required)"
}
```

**Example Request:**

```json
{
  "compositionId": "f3e1c2d4-1234-5678-abcd-ef0123456789",
  "exportType": "full"
}
```

#### Response `200 OK`

```json
{
  "exportId":      "uuid",
  "exportType":    "full",
  "fileName":      "dark-trap-vol-1-full.mid",
  "downloadUrl":   "https://storage.r3native.io/exports/uuid/full.mid?sig=...",
  "expiresAt":     "2026-08-29T14:22:00Z",
  "fileSizeBytes": 4096
}
```

-----

### `GET /exports/:id`

**tRPC:** `exports.getExport`

Retrieve a previously generated export record.

#### Response `200 OK`

```json
{
  "export": { "$ref": "#/components/schemas/Export" }
}
```

-----

### `GET /exports`

**tRPC:** `exports.listExports`

List all exports for the authenticated user.

#### Query Parameters

|Parameter      |Type   |Default|Description          |
|---------------|-------|-------|---------------------|
|`page`         |integer|1      |—                    |
|`pageSize`     |integer|20     |Max 100              |
|`compositionId`|UUID   |—      |Filter by composition|

#### Response `200 OK`

```json
{
  "exports": [
    { "$ref": "#/components/schemas/Export" }
  ],
  "pagination": { "$ref": "#/components/schemas/Pagination" }
}
```

-----

## 5. Copilot Endpoints

### `POST /copilot/analyze`

**tRPC:** `copilot.analyze`

Run the AI analysis agent against a composition and return scored recommendations.

**Rate Limit:** 30 requests/minute per user

#### Request Body

```json
{
  "compositionId": "uuid (required)"
}
```

#### Response `200 OK`

```json
{
  "analysisId":  "uuid",
  "analysisMs":  2140,
  "analysis": {
    "overallScore": 74,
    "dimensionScores": {
      "melody":    82,
      "harmony":   78,
      "rhythm":    70,
      "structure": 65
    },
    "styleMatch": 0.88,
    "recommendations": [
      {
        "dimension": "structure",
        "severity":  "suggestion",
        "message":   "The composition has no distinct break section. Consider adding a 4-bar drop before bar 17 to create energy contrast.",
        "action":    null
      },
      {
        "dimension": "rhythm",
        "severity":  "info",
        "message":   "Hi-hat density is consistent throughout. Introducing open hi-hats on the off-beats in bars 5–8 would increase groove.",
        "action":    "apply_open_hihat_variation"
      }
    ]
  }
}
```

-----

### `POST /copilot/suggestions`

**tRPC:** `copilot.getSuggestions`

Get follow-up suggestions based on a natural language question about the composition.

#### Request Body

```json
{
  "compositionId": "uuid (required)",
  "question":      "string (3–500 chars, required)"
}
```

**Example Request:**

```json
{
  "compositionId": "f3e1c2d4-1234-5678-abcd-ef0123456789",
  "question": "How can I make this feel more like classic 90s boom bap?"
}
```

#### Response `200 OK`

```json
{
  "suggestions": [
    {
      "type":    "text",
      "content": "Lower the BPM to around 90–95. Classic boom bap sits between 88–96 BPM. Your current tempo of 140 is closer to trap territory."
    },
    {
      "type":    "text",
      "content": "Shift the snare to beats 2 and 4 only, and add a rim shot on beat 4+. Boom bap drums are sparser than trap patterns."
    },
    {
      "type":    "chord_suggestion",
      "content": "Add minor 7th extensions to your chords: Cm → Cm7, Ab → Abmaj7. Boom bap harmony tends to be jazzier."
    }
  ]
}
```

-----

## 6. Shared Schemas

### `Composition`

```yaml
Composition:
  type: object
  required: [id, key, bpm, timeSignature, harmony, melodies, drums]
  properties:
    id:            { type: string, format: uuid }
    key:           { $ref: '#/components/schemas/Key' }
    bpm:           { type: integer, minimum: 60, maximum: 200 }
    timeSignature: { $ref: '#/components/schemas/TimeSignature' }
    harmony:       { $ref: '#/components/schemas/HarmonyResult' }
    melodies:
      type: array
      items: { $ref: '#/components/schemas/MelodyResult' }
    drums:         { $ref: '#/components/schemas/DrumPattern' }
    createdAt:     { type: string, format: date-time }
```

### `HarmonyResult`

```yaml
HarmonyResult:
  type: object
  required: [key, bpm, timeSignature, chords]
  properties:
    key:           { $ref: '#/components/schemas/Key' }
    bpm:           { type: integer }
    timeSignature: { $ref: '#/components/schemas/TimeSignature' }
    chords:
      type: array
      minItems: 4
      maxItems: 16
      items:
        type: object
        required: [position, symbol, romanNumeral, duration, midiNotes]
        properties:
          position:     { type: integer, description: "Beat position (1-indexed)" }
          symbol:       { type: string, example: "Cm7" }
          romanNumeral: { type: string, example: "i7" }
          duration:     { type: number, description: "Duration in beats" }
          midiNotes:    { type: array, items: { type: integer, minimum: 0, maximum: 127 } }
```

### `MelodyResult`

```yaml
MelodyResult:
  type: object
  required: [type, phraseCount, notes]
  properties:
    type:        { type: string, enum: [lead, hook] }
    phraseCount: { type: integer, minimum: 1 }
    notes:
      type: array
      items:
        type: object
        required: [pitch, startBeat, duration, velocity]
        properties:
          pitch:     { type: integer, minimum: 0,   maximum: 127 }
          startBeat: { type: number }
          duration:  { type: number, minimum: 0.25 }
          velocity:  { type: integer, minimum: 1,   maximum: 127 }
```

### `DrumPattern`

```yaml
DrumPattern:
  type: object
  required: [bpm, bars, steps, tracks]
  properties:
    bpm:   { type: integer }
    bars:  { type: integer, minimum: 1, maximum: 8 }
    steps: { type: integer, enum: [8, 16, 32] }
    swing: { type: number, minimum: 0.0, maximum: 1.0 }
    tracks:
      type: object
      required: [kick, snare, hihat]
      properties:
        kick:   { type: array, items: { type: boolean } }
        snare:  { type: array, items: { type: boolean } }
        hihat:  { type: array, items: { type: boolean } }
        openHH: { type: array, items: { type: boolean } }
        clap:   { type: array, items: { type: boolean } }
```

### `Project`

```yaml
Project:
  type: object
  required: [id, userId, name, createdAt, updatedAt]
  properties:
    id:          { type: string, format: uuid }
    userId:      { type: string, format: uuid }
    name:        { type: string, maxLength: 100 }
    tags:        { type: array, items: { type: string } }
    version:     { type: integer, description: "Optimistic lock counter" }
    deletedAt:   { type: string, format: date-time, nullable: true }
    createdAt:   { type: string, format: date-time }
    updatedAt:   { type: string, format: date-time }
```

### `ProjectSummary`

```yaml
ProjectSummary:
  type: object
  properties:
    id:                { type: string, format: uuid }
    name:              { type: string }
    tags:              { type: array, items: { type: string } }
    compositionCount:  { type: integer }
    latestExportAt:    { type: string, format: date-time, nullable: true }
    updatedAt:         { type: string, format: date-time }
```

### `Export`

```yaml
Export:
  type: object
  required: [id, compositionId, exportType, fileName, downloadUrl, expiresAt, fileSizeBytes]
  properties:
    id:            { type: string, format: uuid }
    compositionId: { type: string, format: uuid }
    exportType:    { type: string, enum: [melody, chords, drums, full] }
    fileName:      { type: string }
    downloadUrl:   { type: string, format: uri }
    expiresAt:     { type: string, format: date-time }
    fileSizeBytes: { type: integer }
    createdAt:     { type: string, format: date-time }
```

### `CopilotAnalysis`

```yaml
CopilotAnalysis:
  type: object
  required: [overallScore, dimensionScores, styleMatch, recommendations]
  properties:
    overallScore:
      type: integer
      minimum: 0
      maximum: 100
    dimensionScores:
      type: object
      required: [melody, harmony, rhythm, structure]
      properties:
        melody:    { type: integer, minimum: 0, maximum: 100 }
        harmony:   { type: integer, minimum: 0, maximum: 100 }
        rhythm:    { type: integer, minimum: 0, maximum: 100 }
        structure: { type: integer, minimum: 0, maximum: 100 }
    styleMatch:
      type: number
      minimum: 0.0
      maximum: 1.0
    recommendations:
      type: array
      minItems: 1
      items:
        type: object
        required: [dimension, severity, message]
        properties:
          dimension: { type: string, enum: [melody, harmony, rhythm, structure] }
          severity:  { type: string, enum: [info, suggestion, warning] }
          message:   { type: string }
          action:    { type: string, nullable: true }
```

### Enum Schemas

```yaml
Genre:
  type: string
  enum: [hip-hop, rnb, pop, electronic, afrobeats, trap, jazz, soul, lo-fi, dance]

Mood:
  type: string
  enum: [energetic, chill, dark, uplifting, melancholic, aggressive, romantic, nostalgic]

Key:
  type: string
  enum: [C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B,
         Cm, C#m, Dbm, Dm, D#m, Ebm, Em, Fm, F#m, Gbm, Gm, G#m, Abm, Am, A#m, Bbm, Bm]

TimeSignature:
  type: string
  enum: ["4/4", "3/4", "6/8"]

Pagination:
  type: object
  properties:
    page:       { type: integer }
    pageSize:   { type: integer }
    total:      { type: integer }
    totalPages: { type: integer }
```

-----

## 7. Error Schemas

### Standard Error Response

```yaml
ErrorResponse:
  type: object
  required: [error]
  properties:
    error:
      type: object
      required: [code, message]
      properties:
        code:    { type: string }
        message: { type: string }
        details: { type: object, nullable: true }
```

### Error Code Reference

|Code                   |HTTP Status|Description                                                                       |
|-----------------------|-----------|----------------------------------------------------------------------------------|
|`INVALID_REQUEST`      |400        |One or more input fields failed validation. `details` contains field-level errors.|
|`UNAUTHORIZED`         |401        |JWT missing, malformed, or expired.                                               |
|`FORBIDDEN`            |403        |Authenticated user lacks permission to access this resource.                      |
|`NOT_FOUND`            |404        |The requested resource does not exist or belongs to another user.                 |
|`RATE_LIMITED`         |429        |Request rate exceeds the allowed limit. `details.retryAfterSeconds` is provided.  |
|`GENERATION_FAILED`    |500        |AI pipeline failed to produce a result. Safe to retry.                            |
|`EXPORT_FAILED`        |500        |MIDI serialization or file storage failure. Safe to retry.                        |
|`INTERNAL_SERVER_ERROR`|500        |Unexpected server error. Report to support if persistent.                         |

-----

## 8. Full YAML Spec

```yaml
openapi: 3.1.0

info:
  title: R3 Intelligent Composer API
  version: 1.0.0
  description: >
    AI-assisted music composition API for R3 Native.
    Generates chord progressions, melodies, drum patterns,
    and MIDI exports from natural language prompts.

servers:
  - url: https://api.r3native.io/api
    description: Production
  - url: https://staging.api.r3native.io/api
    description: Staging

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # — All schemas defined in Section 6 above —

paths:
  /composer/generate:
    post:
      summary: Generate a composition
      operationId: composerGenerate
      tags: [Composer]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [prompt, genre, mood]
              properties:
                prompt:        { type: string, minLength: 3, maxLength: 500 }
                genre:         { $ref: '#/components/schemas/Genre' }
                mood:          { $ref: '#/components/schemas/Mood' }
                bpm:           { type: integer, minimum: 60, maximum: 200 }
                key:           { $ref: '#/components/schemas/Key' }
                timeSignature: { $ref: '#/components/schemas/TimeSignature' }
      responses:
        '200':
          description: Composition generated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  compositionId: { type: string, format: uuid }
                  composition:   { $ref: '#/components/schemas/Composition' }
                  lowConfidence: { type: boolean }
                  generationMs:  { type: integer }
        '400': { $ref: '#/components/responses/BadRequest' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '500': { $ref: '#/components/responses/GenerationFailed' }

  /composer/regenerate:
    post:
      summary: Regenerate a composition, optionally locking components
      operationId: composerRegenerate
      tags: [Composer]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [compositionId]
              properties:
                compositionId: { type: string, format: uuid }
                keepHarmony:   { type: boolean, default: false }
                keepMelody:    { type: boolean, default: false }
                keepRhythm:    { type: boolean, default: false }
      responses:
        '200': { description: Regenerated composition }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /composer/compositions/{id}:
    get:
      summary: Get a composition by ID
      operationId: getComposition
      tags: [Composer]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: Composition record }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /projects:
    get:
      summary: List projects
      operationId: listProjects
      tags: [Projects]
      parameters:
        - { name: page,     in: query, schema: { type: integer, default: 1 } }
        - { name: pageSize, in: query, schema: { type: integer, default: 20, maximum: 100 } }
        - { name: sort,     in: query, schema: { type: string, enum: [createdAt, updatedAt, name] } }
        - { name: order,    in: query, schema: { type: string, enum: [asc, desc] } }
      responses:
        '200': { description: Paginated project list }
        '401': { $ref: '#/components/responses/Unauthorized' }
    post:
      summary: Create a project
      operationId: createProject
      tags: [Projects]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:          { type: string, minLength: 1, maxLength: 100 }
                tags:          { type: array, items: { type: string, maxLength: 30 }, maxItems: 10 }
                compositionId: { type: string, format: uuid }
      responses:
        '201': { description: Project created }
        '400': { $ref: '#/components/responses/BadRequest' }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /projects/{id}:
    get:
      summary: Load a project
      operationId: loadProject
      tags: [Projects]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Project with latest composition }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
    patch:
      summary: Update project metadata
      operationId: updateProject
      tags: [Projects]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                tags: { type: array, items: { type: string } }
      responses:
        '200': { description: Updated project }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
    delete:
      summary: Soft-delete a project
      operationId: deleteProject
      tags: [Projects]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Project soft-deleted }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /projects/{id}/save:
    post:
      summary: Save a version snapshot
      operationId: saveProject
      tags: [Projects]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [compositionId]
              properties:
                compositionId: { type: string, format: uuid }
                label:         { type: string, maxLength: 50 }
      responses:
        '200': { description: Version snapshot saved }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /projects/{id}/versions:
    get:
      summary: List version snapshots
      operationId: listVersions
      tags: [Projects]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Version list }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /exports/midi:
    post:
      summary: Export composition as MIDI
      operationId: exportMidi
      tags: [Exports]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [compositionId, exportType]
              properties:
                compositionId: { type: string, format: uuid }
                exportType:    { type: string, enum: [melody, chords, drums, full] }
      responses:
        '200':
          description: MIDI export ready
          content:
            application/json:
              schema:
                type: object
                properties:
                  exportId:      { type: string, format: uuid }
                  exportType:    { type: string }
                  fileName:      { type: string }
                  downloadUrl:   { type: string, format: uri }
                  expiresAt:     { type: string, format: date-time }
                  fileSizeBytes: { type: integer }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }
        '500': { $ref: '#/components/responses/ExportFailed' }

  /exports/{id}:
    get:
      summary: Get export record
      operationId: getExport
      tags: [Exports]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Export record }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /exports:
    get:
      summary: List exports
      operationId: listExports
      tags: [Exports]
      parameters:
        - { name: page,          in: query, schema: { type: integer } }
        - { name: pageSize,      in: query, schema: { type: integer } }
        - { name: compositionId, in: query, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Export list }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /copilot/analyze:
    post:
      summary: Analyze a composition
      operationId: copilotAnalyze
      tags: [Copilot]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [compositionId]
              properties:
                compositionId: { type: string, format: uuid }
      responses:
        '200': { description: Analysis result }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  /copilot/suggestions:
    post:
      summary: Get follow-up suggestions
      operationId: copilotSuggestions
      tags: [Copilot]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [compositionId, question]
              properties:
                compositionId: { type: string, format: uuid }
                question:      { type: string, minLength: 3, maxLength: 500 }
      responses:
        '200': { description: Suggestions returned }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotFound' }

  components:
    responses:
      BadRequest:
        description: Validation error
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      Unauthorized:
        description: Authentication required
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      Forbidden:
        description: Insufficient permissions
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      NotFound:
        description: Resource not found
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      RateLimited:
        description: Rate limit exceeded
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      GenerationFailed:
        description: AI generation failure
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
      ExportFailed:
        description: MIDI export failure
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ErrorResponse' }
```