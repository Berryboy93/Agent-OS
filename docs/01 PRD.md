# R3 Intelligent Composer + Virtual Composer Machine (VCM)

## Product Requirements Document (PRD) · v2.0

|Field         |Value                                                           |
|--------------|----------------------------------------------------------------|
|Status        |**Approved for MVP Development**                                |
|Product Owner |R3 Native                                                       |
|Version       |2.0 — VCM Integration                                           |
|Target Release|12 Weeks (Phase 1: Weeks 1–8 Composer / Phase 2: Weeks 9–12 VCM)|
|Supersedes    |PRD v1.0                                                        |
|Last Updated  |2026-05-31                                                      |

-----

## Table of Contents

1. [Executive Summary](#1-executive-summary)
1. [Product Vision](#2-product-vision)
1. [Problem Statement](#3-problem-statement)
1. [Product Goals](#4-product-goals)
1. [Success Metrics](#5-success-metrics)
1. [User Personas](#6-user-personas)
1. [User Stories](#7-user-stories)
1. [Functional Requirements — Intelligent Composer](#8-functional-requirements--intelligent-composer)
1. [Functional Requirements — Virtual Composer Machine](#9-functional-requirements--virtual-composer-machine)
1. [Non-Functional Requirements](#10-non-functional-requirements)
1. [Data Requirements](#11-data-requirements)
1. [AI Requirements](#12-ai-requirements)
1. [Audio Engine Requirements](#13-audio-engine-requirements)
1. [MIDI Requirements](#14-midi-requirements)
1. [Analytics Requirements](#15-analytics-requirements)
1. [Error Handling](#16-error-handling)
1. [Testing Requirements](#17-testing-requirements)
1. [Security Requirements](#18-security-requirements)
1. [Accessibility Requirements](#19-accessibility-requirements)
1. [Release Scope](#20-release-scope)
1. [Risks & Mitigations](#21-risks--mitigations)
1. [Definition of Done](#22-definition-of-done)
1. [Future Roadmap](#23-future-roadmap)
1. [Appendix A — Grid Mode Reference](#24-appendix-a--grid-mode-reference)
1. [Appendix B — Agent Output Schemas](#25-appendix-b--agent-output-schemas)

-----

## 1. Executive Summary

**R3 Intelligent Composer** is an AI-assisted music composition platform integrated into R3 Native. The **Virtual Composer Machine (VCM)** is its interactive performance and production surface — a software-only rendition of a hardware controller, running entirely in the browser.

Together they form a single unified product: users generate musical ideas through natural language prompts, interact with and perform those ideas on a tactile 8×8 grid surface, refine them in a multi-section timeline, and export the result as industry-standard MIDI or as a full arranged project.

Think of the VCM as a software-only hardware controller that lives inside R3 Native. It gives creators a physical-feeling performance surface without requiring dedicated hardware — no Ableton Push, no Maschine, no external device needed. Every pad, encoder, and transport control is rendered in the browser and backed by real audio and AI intelligence.

### What Ships

|Capability                  |Phase|Description                                                           |
|----------------------------|-----|----------------------------------------------------------------------|
|Chord Progression Generation|1    |Harmonically coherent progressions from a prompt                      |
|Melody Generation           |1    |Lead and hook melodies in key and tempo                               |
|Bass Line Generation        |1    |Root-motion and melodic bass lines                                    |
|Drum Pattern Generation     |1    |Kick, snare, hi-hat, clap patterns at BPM                             |
|Arrangement Generation      |1    |Intro / Verse / Hook / Bridge / Outro structure                       |
|Composition Analysis        |1    |Structural scoring and recommendations                                |
|MIDI Export                 |1    |Per-track and full-composition MIDI                                   |
|Project Management          |1    |Save, load, version, and manage compositions                          |
|Producer Copilot            |1    |AI assistant for feedback and iteration                               |
|8×8 Performance Grid        |2    |64 RGB pads: Piano, Drum Rack, Chord, Scale, Session, Sequencer modes |
|Smart Touch Encoders        |2    |8 virtual knobs: Volume, Pan, Filter, Reverb, Delay, Macros, AI Params|
|Timeline Engine             |2    |Drag-and-drop section arrangement: Intro, Verse, Hook, Bridge, Outro  |
|AI Performance Mode         |2    |Generate variations without destroying original work                  |
|AI Jam Mode                 |2    |Real-time AI accompaniment as user plays pads                         |
|Chord Memory                |2    |One-pad full chord playback with voicing intelligence                 |
|Smart Scale Mode            |2    |Wrong note correction locked to key                                   |
|MIDI I/O                    |2    |MIDI input, output, learn, and export                                 |

### The Long View

The VCM is the first step toward R3 Native becoming a Music Operating System: a single environment where a creator can generate ideas with AI, perform them live on a virtual hardware surface, edit them in a timeline, collaborate with other creators, and export to any format — all without leaving the browser.

-----

## 2. Product Vision

### Vision Statement

R3 Intelligent Composer + VCM becomes the **central intelligence and performance layer** inside R3 Native — functioning as Composer, Producer, Arranger, Performer, and Creative Assistant within a single unified surface.

### Vision Pillars

**Speed** — A creator with no prior theory knowledge should have a complete, playable musical foundation within 60 seconds of opening the product. The AI handles structure; the creator handles feel.

**Control** — All generated content is editable, performable, and non-destructive. The AI proposes; the creator decides. Nothing is ever overwritten without confirmation.

**Depth** — The system grows with the creator. A beginner benefits from Smart Scale Mode and Chord Memory so wrong notes are impossible. A professional benefits from MIDI Learn, per-track automation, and granular arrangement control.

**Performance** — The VCM is a real instrument, not a menu. Pads respond to velocity with <10ms latency. The grid renders at 120 FPS. Encoders control audio parameters in real time with zero audible stepping artifacts.

**Integration** — All output is industry-standard. MIDI files import cleanly into Ableton Live, FL Studio, Logic Pro, and Studio One. The VCM also supports incoming hardware MIDI so a physical Push or Maschine can drive R3’s audio engine.

**Intelligence** — The AI layer is context-aware. It knows the key, the tempo, the genre, the arrangement section, and the user’s pad activity. Suggestions and variations are always musically coherent with what is already on the timeline.

### What R3 Replaces

|Traditional Workflow                       |R3 Native Replacement               |
|-------------------------------------------|------------------------------------|
|Hardware controller (Push, Maschine) + DAW |VCM + R3 Native (browser)           |
|Separate melody sketching tools            |Melody Agent + Piano Mode grid      |
|Manual drum programming in a step sequencer|Drum Rack Mode + Rhythm Agent       |
|Theory books / chord charts                |Chord Mode + Smart Scale Mode       |
|A&R consultation on arrangement            |Producer Copilot + Arrangement Agent|
|Multi-session DAW arrangements             |Timeline Engine in-browser          |

-----

## 3. Problem Statement

### Creator Pain Points

|Pain Point                         |Severity|Impact                                                       |
|-----------------------------------|--------|-------------------------------------------------------------|
|Writer’s block                     |Critical|Sessions start and stall; projects go unfinished             |
|Slow composition workflows         |High    |Time spent on mechanics, not creativity                      |
|Repetitive production tasks        |High    |Fatigue; reduced output quality                              |
|Difficulty generating initial ideas|Critical|High abandonment rate on blank canvas                        |
|Difficulty arranging full songs    |High    |Many producers have loops, not songs                         |
|Hardware barrier to entry          |High    |$400–$800 controllers required for tactile workflow          |
|Theory knowledge gap               |Medium  |Limits harmonic and melodic complexity                       |
|DAW switching friction             |Medium  |Exporting, reformatting, re-importing wastes session momentum|
|No feedback during creation        |Medium  |Creators don’t know if what they’re making is working        |
|Live performance gap               |High    |DAW projects can’t be performed; loops need hardware         |

### The Hardware Problem

Professional music production has always required a physical surface. Ableton Push 3 ($800), Native Instruments Maschine+ ($1,200), Arturia BeatStep Pro ($200) — the barrier to tactile music creation is real and financial. Emerging creators in key R3 markets (Africa, South America, Southeast Asia) are building careers on budget laptops with no hardware budget. The VCM solves this entirely: a full-featured performance surface that ships inside the browser at zero hardware cost.

### Market Gap

Existing AI music tools fall into three categories:

1. **Full audio generators** (Suno, Udio) — Generate complete audio tracks. Removes all creator agency. Output is non-editable.
1. **MIDI loop generators** (isolated tools) — Generate single loops without context. No performance surface, no arrangement, no iteration.
1. **DAW AI assistants** (iZotope Neutron, etc.) — Mix-and-master tools, not composition tools. Require the creator to already have something to work on.

None of these provide an **interactive, AI-powered performance environment** where the creator generates, performs, edits, and iterates within a single surface. R3 Intelligent Composer + VCM fills this gap entirely.

-----

## 4. Product Goals

### Primary Goal

> Any creator — regardless of theory knowledge or hardware budget — can open R3 Native, generate a complete multi-section musical idea, perform it live on the VCM grid, and export industry-standard MIDI within **3 minutes** of first use.

### Phase 1 Goals (Composer, Weeks 1–8)

|Goal                           |Metric                                              |
|-------------------------------|----------------------------------------------------|
|Usable foundation in 60 seconds|Time from first prompt to first composition output  |
|Reduce creative friction       |NPS > 50 among beta users                           |
|Enable rapid prototyping       |Average compositions per session > 3                |
|Increase project completion    |Projects with ≥ 1 MIDI export / total projects > 40%|
|Prove AI quality               |Style-match confidence > 0.75 average across genres |

### Phase 2 Goals (VCM, Weeks 9–12)

|Goal                                   |Metric                                                |
|---------------------------------------|------------------------------------------------------|
|Hardware-free performance              |% of sessions with ≥ 1 pad interaction > 60%          |
|Grid latency below perception threshold|Pad-to-audio latency P95 < 10ms                       |
|MIDI round-trip for external hardware  |External MIDI device to audio < 5ms additional latency|
|Full arrangement coverage              |% of projects using all 5 timeline sections > 30%     |
|AI Jam Mode adoption                   |% of sessions using Jam Mode > 25%                    |

### Long-Term Goals

|Goal                                            |Horizon      |
|------------------------------------------------|-------------|
|Replace hardware controllers for 80% of R3 users|v2 (6 months)|
|10,000 monthly active creators                  |v2           |
|DAW integration via VST/AU wrapper              |v3           |
|Real-time collaboration on VCM                  |v3           |
|Mobile VCM (touch-native)                       |v3           |

-----

## 5. Success Metrics

### Core Product Metrics

|Metric                             |Target                      |Hard Limit          |
|-----------------------------------|----------------------------|--------------------|
|Composition generation success rate|≥ 95%                       |< 2% error rate     |
|P50 generation time                |< 5 seconds                 |—                   |
|P95 generation time                |< 10 seconds                |30 seconds (timeout)|
|MIDI export success rate           |≥ 99%                       |—                   |
|Project save success rate          |≥ 99.9%                     |—                   |
|API availability                   |≥ 99.5% uptime              |—                   |
|Style-match confidence (average)   |≥ 0.75                      |—                   |
|Arrangement agent coverage         |100% of 5 sections populated|—                   |

### VCM Performance Metrics

|Metric                    |Target                     |Notes                                                   |
|--------------------------|---------------------------|--------------------------------------------------------|
|Grid render rate          |≥ 120 FPS                  |WebGL canvas; measured via `requestAnimationFrame` delta|
|Pad-to-audio latency P50  |< 5ms                      |From `pointerdown` to first audio sample output         |
|Pad-to-audio latency P95  |< 10ms                     |—                                                       |
|Encoder response time     |< 2ms                      |From drag to parameter update in Tone.js                |
|MIDI input → audio latency|< 15ms                     |Hardware MIDI device to audio output                    |
|MIDI output correctness   |100% note-on/note-off pairs|No orphaned MIDI note-ons                               |
|Grid mode switch time     |< 100ms                    |No visible flash or layout jump                         |

### User Engagement Metrics (30-Day Cohort)

|Metric                                   |Target                              |
|-----------------------------------------|------------------------------------|
|Projects created per user                |≥ 5                                 |
|Compositions generated per user          |≥ 10                                |
|Exports per user                         |≥ 3                                 |
|Grid interactions per session            |≥ 20 (pad taps or encoder movements)|
|Timeline sections used per project       |≥ 3                                 |
|AI Jam Mode sessions                     |≥ 2 per user                        |
|Producer Copilot interactions per session|≥ 2                                 |
|7-day retention                          |≥ 40%                               |
|30-day retention                         |≥ 25%                               |
|Session duration average                 |≥ 12 minutes                        |

### Business Metrics

|Metric                             |Target          |
|-----------------------------------|----------------|
|Beta user NPS                      |≥ 50            |
|Projects with at least 1 export    |≥ 40%           |
|Paid conversion rate (if monetized)|≥ 8%            |
|Support ticket rate                |< 2% of sessions|

-----

## 6. User Personas

### Persona A — Independent Producer

|Field      |Detail                                                                                          |
|-----------|------------------------------------------------------------------------------------------------|
|Background |Self-taught beatmaker, 2–5 years experience, works in FL Studio or Ableton                      |
|Workflow   |Starts with a loop, builds around it, struggles to finish full songs                            |
|Tools      |FL Studio or Ableton, sample packs, one-shot kits                                               |
|Goals      |Generate ideas quickly; export MIDI into existing sessions; finish more songs                   |
|Pain Points|Creative blocks mid-session; spends too long on chord structure; no arrangement discipline      |
|VCM Value  |Drum Rack Mode replaces Maschine; Session Mode for loop launching; AI Jam Mode for live building|
|Key Metrics|Exports per session; compositions per week; songs finished per month                            |

### Persona B — Songwriter

|Field      |Detail                                                                                                      |
|-----------|------------------------------------------------------------------------------------------------------------|
|Background |Vocalist or guitarist with limited MIDI/production skills, works in Logic or GarageBand                     |
|Workflow   |Hums ideas, records voice memos, struggles to get them into a DAW with proper arrangement                   |
|Goals      |Generate chord beds; build melodies; produce arrangements that feel like real songs                         |
|Pain Points|Theory gaps; hook-writing difficulty; bridge and outro feel tacked-on                                       |
|VCM Value  |Piano Mode for melody sketching; Chord Memory for instant chord playback; Timeline Engine for song structure|
|Key Metrics|Timeline sections used; hook variations generated; project completion rate                                  |

### Persona C — Music Creator / Student

|Field      |Detail                                                                                                         |
|-----------|---------------------------------------------------------------------------------------------------------------|
|Background |Hobbyist or music student, no DAW, limited theory, uses R3 as primary tool                                     |
|Workflow   |Exploratory; discovers genres and sounds; learns by doing                                                      |
|Goals      |Experiment with genres; learn composition theory; produce something they’re proud of                           |
|Pain Points|Wrong notes; fear of harmonic mistakes; confusion about arrangement                                            |
|VCM Value  |Smart Scale Mode (no wrong notes); Chord Mode (play complex chords with one pad); Producer Copilot explanations|
|Key Metrics|Session length; grid interactions; Copilot interactions                                                        |

### Persona D — Live Performer / DJ

|Field      |Detail                                                                                                                   |
|-----------|-------------------------------------------------------------------------------------------------------------------------|
|Background |DJ or live electronic musician who builds sets around performance energy                                                 |
|Workflow   |Prepares clip libraries; performs live using hardware; needs software fallback or hybrid setup                           |
|Goals      |Perform live sets from R3; trigger clips and variations on the fly; respond to crowd energy                              |
|Pain Points|Hardware-dependent; clip management across platforms; variation generation mid-set                                       |
|VCM Value  |Session Mode for live clip launching; AI Performance Mode for real-time variations; 120 FPS grid for live visual feedback|
|Key Metrics|Session Mode clip triggers per session; AI Performance Mode invocations; MIDI export for hardware sync                   |

### Persona E — Bedroom Producer (Emerging Markets)

|Field      |Detail                                                                               |
|-----------|-------------------------------------------------------------------------------------|
|Background |16–24 years old, phone and mid-range laptop, no hardware budget, highly motivated    |
|Workflow   |Entirely in-browser; no VSTs; limited internet bandwidth                             |
|Goals      |Make professional-sounding music; grow audience; potentially monetize                |
|Pain Points|No hardware; no software budget; theory gaps; isolation from production communities  |
|VCM Value  |Full VCM surface at $0 hardware cost; AI handles theory; browser-native so no install|
|Key Metrics|Sessions from mobile browser; data-efficient audio; offline capability (future)      |

-----

## 7. User Stories

### 7.1 — Composition Generation

|ID    |Story                                                                                                                           |Acceptance Criteria                                                                                |Priority|
|------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|--------|
|US-001|As a user, I want to enter a natural language prompt so that I can generate a complete musical idea.                            |Valid prompt returns chord + melody + bass + drum + arrangement objects within 10 seconds.         |P0      |
|US-002|As a user, I want to specify genre and mood so that the output matches my creative intent.                                      |Generation respects genre/mood; output is stylistically coherent; style-match ≥ 0.65.              |P0      |
|US-003|As a user, I want to lock BPM and key so that the output fits my existing session.                                              |Generated content matches locked BPM ±1 and selected key exactly.                                  |P0      |
|US-004|As a user, I want a bass line generated alongside chords and melody so that the composition feels complete.                     |Bass line is in key, follows chord root motion, does not conflict with kick drum frequencies.      |P0      |
|US-005|As a user, I want an arrangement automatically generated so that the composition has a song structure.                          |Arrangement includes ≥ 3 of 5 sections (Intro, Verse, Hook, Bridge, Outro) with correct bar counts.|P0      |
|US-006|As a user, I want to regenerate individual components (keep harmony, change melody) so that I can iterate without starting over.|Lock flags respected; locked components unchanged; unlocked components regenerated.                |P0      |
|US-007|As a user, I want low-confidence generations flagged so that I know when to regenerate.                                         |`lowConfidence: true` shown in UI; regeneration prompt displayed; user can dismiss.                |P1      |
|US-008|As a user, I want to see named chords with Roman numerals so that I can understand the harmony I’ve created.                    |Each chord displays symbol (e.g. Cm7), Roman numeral (i7), and MIDI voicing.                       |P1      |

### 7.2 — VCM Grid

|ID    |Story                                                                                                                        |Acceptance Criteria                                                                                           |Priority|
|------|-----------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|--------|
|US-009|As a user, I want to see an 8×8 grid of RGB pads so that I have a tactile performance surface.                               |64 pads rendered at 120 FPS; pad color matches mode (note velocity = brightness); no frame drops below 60 FPS.|P0      |
|US-010|As a user, I want to play individual notes in Piano Mode so that I can sketch melodies by hand.                              |Tap a pad → correct MIDI note plays within 10ms; note label shown on pad.                                     |P0      |
|US-011|As a user, I want to play drums in Drum Rack Mode so that I can perform and edit drum patterns.                              |16 drum pads mapped to GM drum map; velocity-sensitive; triggering a pad plays sample within 10ms.            |P0      |
|US-012|As a user, I want to play full chords with one pad in Chord Mode so that I can perform harmonically without theory knowledge.|Single pad tap plays all chord notes simultaneously; chord name displayed; voicing is musically correct.      |P0      |
|US-013|As a user, I want Smart Scale Mode to prevent wrong notes so that I can play freely without theory anxiety.                  |All pads in Scale Mode only trigger in-key notes; no chromatic notes accessible; key label shown in UI.       |P1      |
|US-014|As a user, I want to launch clips in Session Mode so that I can perform live arrangements.                                   |Clip pads show play/stop state; launching a clip cross-fades with ≤ 10ms gap; stop button silences cleanly.   |P1      |
|US-015|As a user, I want to program sequences in Sequencer Mode so that I can build patterns step-by-step.                          |16-step sequencer per row; playhead visible; steps toggle on/off with single tap; BPM synced.                 |P1      |
|US-016|As a user, I want the grid to switch modes without restarting the audio so that my session is never interrupted.             |Mode switch < 100ms; audio engine continues uninterrupted; active notes fade naturally.                       |P0      |

### 7.3 — Smart Encoders

|ID    |Story                                                                                                              |Acceptance Criteria                                                                                        |Priority|
|------|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|--------|
|US-017|As a user, I want virtual encoders that control audio parameters so that I can mix without leaving the VCM surface.|8 encoders rendered; drag gesture changes value; audio parameter updates within 2ms.                       |P0      |
|US-018|As a user, I want encoders to control AI generation parameters so that I can tune the AI without typing.           |“Complexity”, “Density”, “Brightness” encoders present in AI mode; adjusting triggers regeneration preview.|P1      |
|US-019|As a user, I want encoder assignments to change per grid mode so that relevant controls are always available.      |Encoder labels update when grid mode changes; values persist per-mode.                                     |P1      |

### 7.4 — Timeline Engine

|ID    |Story                                                                                                                |Acceptance Criteria                                                                                  |Priority|
|------|---------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|--------|
|US-020|As a user, I want to see my arrangement as a timeline with named sections so that I can understand my song structure.|Timeline renders Intro, Verse, Hook, Bridge, Outro with correct bar widths; section labels visible.  |P0      |
|US-021|As a user, I want to drag clips onto the timeline so that I can arrange my song.                                     |Drag a composition or clip from the grid to a timeline section; playback reflects new arrangement.   |P0      |
|US-022|As a user, I want to resize timeline sections so that I can control the length of each song part.                    |Drag section edge to resize; bar count label updates in real time; minimum 1 bar per section.        |P1      |
|US-023|As a user, I want the AI to auto-arrange my compositions so that I have a starting structure to edit.                |“Auto-Arrange” button populates all 5 sections using the Arrangement Agent output; user can override.|P1      |
|US-024|As a user, I want to reorder sections by dragging so that I can experiment with different song structures.           |Drag section header to reorder; audio reflects new order during playback.                            |P1      |

### 7.5 — AI Performance & Jam Mode

|ID    |Story                                                                                                                   |Acceptance Criteria                                                                                                         |Priority|
|------|------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|--------|
|US-025|As a user, I want to generate a variation without destroying my original so that I can explore ideas safely.            |“Generate Variation” creates new melody, groove, or arrangement; original preserved as a version snapshot; undo available.  |P0      |
|US-026|As a user, I want the AI to add bass and drums when I play chords in Jam Mode so that I can feel the groove immediately.|Playing any chord pad in Jam Mode triggers real-time AI bass + drum accompaniment within 200ms; continuous as chords change.|P1      |
|US-027|As a user, I want Jam Mode to stay in key so that the AI accompaniment always sounds musical.                           |All AI-generated notes in Jam Mode are diatonic to the locked key; tempo stays locked to session BPM.                       |P1      |
|US-028|As a user, I want to record my Jam Mode performance so that I can capture inspired moments.                             |“Arm Record” button captures pad events and AI accompaniment as a new composition; saved to project.                        |P1      |

### 7.6 — Exports & Workflow

|ID    |Story                                                                                                         |Acceptance Criteria                                                                               |Priority|
|------|--------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|--------|
|US-029|As a user, I want MIDI exports so that I can continue work in my DAW.                                         |MIDI imports without error into Ableton, FL Studio, Logic, Studio One.                            |P0      |
|US-030|As a user, I want per-track MIDI exports so that I can import individual elements.                            |Melody, bass, chords, and drums each export as separate MIDI files; correct GM channels.          |P0      |
|US-031|As a user, I want a full arrangement MIDI export so that I can export the entire song.                        |Full MIDI includes all tracks arranged per timeline; tempo map embedded; marker track per section.|P1      |
|US-032|As a user, I want my project saved automatically so that I never lose work.                                   |Auto-save every 2 minutes; project state restored exactly on reload.                              |P0      |
|US-033|As a user, I want MIDI Learn so that I can map a hardware controller to the VCM.                              |Right-click any encoder or pad → “MIDI Learn” → incoming CC/note assigns to that control.         |P1      |
|US-034|As a user, I want MIDI input from a hardware device so that I can play the VCM’s audio engine with a keyboard.|Connected MIDI keyboard → plays VCM audio engine in real time in current grid mode.               |P1      |

### 7.7 — Analysis & Copilot

|ID    |Story                                                                                                |Acceptance Criteria                                                                            |Priority|
|------|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|--------|
|US-035|As a user, I want composition feedback so that I can improve my music.                               |Producer Copilot returns ≥ 1 specific, actionable recommendation with the option to auto-apply.|P0      |
|US-036|As a user, I want groove analysis so that I know if my rhythm section is working.                    |Copilot evaluates kick/snare/hihat density, syncopation, and swing and returns a groove score. |P1      |
|US-037|As a user, I want energy arc analysis so that I know if my arrangement builds properly.              |Copilot maps energy per section; flags flat arcs; suggests drop/build placement.               |P1      |
|US-038|As a user, I want natural language answers about my composition so that I can learn from the Copilot.|Follow-up prompt (“why does this chord work?”) returns accurate music theory explanation.      |P1      |

-----

## 8. Functional Requirements — Intelligent Composer

### FR-001 · Prompt Input

**Purpose:** Accept and validate all user-supplied composition parameters before passing to the generation pipeline.

**Inputs:**

|Parameter            |Type   |Required|Constraints                       |
|---------------------|-------|--------|----------------------------------|
|`prompt`             |string |Yes     |3–500 characters                  |
|`genre`              |enum   |Yes     |See Genre list                    |
|`mood`               |enum   |Yes     |See Mood list                     |
|`bpm`                |integer|No      |60–200; default auto              |
|`key`                |enum   |No      |All major/minor keys; default auto|
|`timeSignature`      |enum   |No      |4/4, 3/4, 6/8; default 4/4        |
|`generateBass`       |boolean|No      |Default: true                     |
|`generateArrangement`|boolean|No      |Default: true                     |

**Supported Genres:** Hip-Hop, R&B, Pop, Electronic, Afrobeats, Trap, Jazz, Soul, Lo-Fi, Dance, Drill, Dancehall, Reggaeton, House, Techno, Ambient, Classical, Gospel, Country, Rock

**Supported Moods:** Energetic, Chill, Dark, Uplifting, Melancholic, Aggressive, Romantic, Nostalgic, Mysterious, Euphoric, Tense, Dreamy

**Validation Rules:**

- Prompt must not be empty, whitespace-only, or exceed 500 characters
- Numeric parameters must be within stated bounds
- Enum parameters must match defined values (case-insensitive)
- Server-side and client-side validation always performed

**Acceptance Criteria:**

- Valid input initiates the composition pipeline and returns a `compositionId` within 500ms
- Invalid input returns `INVALID_REQUEST` with field-level error messages
- Validation errors are displayed inline at the offending field, not as a toast

-----

### FR-002 · Harmony Engine

**Purpose:** Generate a harmonically coherent key, BPM, and chord progression from validated input.

**Output Contract:**

```
HarmonyResult {
  key:            string        // e.g. "Cm", "F#"
  bpm:            integer
  timeSignature:  string        // e.g. "4/4"
  scale:          string        // e.g. "aeolian", "dorian", "major"
  chords: [
    {
      position:    integer      // Beat position (1-indexed)
      symbol:      string       // e.g. "Cm7"
      romanNumeral: string      // e.g. "i7"
      function:    string       // e.g. "tonic", "predominant", "dominant"
      duration:    number       // In beats
      midiNotes:   integer[]    // MIDI note numbers (voicing)
      bassNote:    integer      // Lowest MIDI note for bass agent
    }
  ]
  progressionLabel: string     // e.g. "i-VI-VII-v" for quick reference
}
```

**Acceptance Criteria:**

- Progressions contain 4–16 chords
- All chords are diatonic, secondary dominant, borrowed, or labeled as such
- BPM respects the `bpm` lock if provided
- `function` field is always populated (tonic / predominant / dominant / other)
- P95 generation time ≤ 10 seconds

-----

### FR-003 · Melody Engine

**Purpose:** Generate a main lead melody and hook variations over the harmony result.

**Output Contract:**

```
MelodyResult {
  type:       "lead" | "hook"
  notes: [
    {
      pitch:     integer    // MIDI note number (0–127)
      startBeat: number
      duration:  number     // In beats
      velocity:  integer    // 1–127
      articulation: string  // "normal" | "staccato" | "legato"
    }
  ]
  phraseCount:   integer
  range:         { low: integer, high: integer }  // MIDI note range
  rhythmDensity: number   // 0.0–1.0 (notes per beat)
}
```

**Acceptance Criteria:**

- All notes are diatonic to the selected key (chromatic passing tones allowed and labeled)
- Minimum 2 hook variations returned
- Melody range stays within a comfortable octave (typically C4–C6 for pop/trap)
- No consecutive identical-pitch repetition > 4 beats

-----

### FR-004 · Bass Engine (New in v2.0)

**Purpose:** Generate a bass line that supports the harmonic and rhythmic content of the composition.

**Output Contract:**

```
BassResult {
  style:  "root" | "melodic" | "walking" | "808"
  notes: [
    {
      pitch:     integer
      startBeat: number
      duration:  number
      velocity:  integer
      slide:     boolean   // Portamento/glide to next note
    }
  ]
  subBass: boolean         // Whether to add a sub octave layer
}
```

**Acceptance Criteria:**

- Bass notes anchor chord root on beats 1 and 3 in 4/4 (genre-appropriate variation allowed)
- `808` style generates detuned sub bass appropriate for trap/drill genres
- Bass line does not rhythmically conflict with kick drum on the same step
- Bass MIDI channel is always Ch. 3

-----

### FR-005 · Rhythm Engine

**Purpose:** Generate a drum pattern aligned to the composition tempo and genre.

**Output Contract:**

```
DrumPattern {
  bpm:      integer
  bars:     integer     // Default: 2
  steps:    integer     // Default: 16; can be 8, 16, or 32
  tracks: {
    kick:    { steps: boolean[], velocities: integer[] }
    snare:   { steps: boolean[], velocities: integer[] }
    hihat:   { steps: boolean[], velocities: integer[] }
    openHH:  { steps: boolean[], velocities: integer[] }  // Optional
    clap:    { steps: boolean[], velocities: integer[] }  // Optional
    perc:    { steps: boolean[], velocities: integer[] }  // Optional
    ride:    { steps: boolean[], velocities: integer[] }  // Optional
  }
  swing:    number      // 0.0–1.0
  genre:    string      // Confirms genre alignment
}
```

**Acceptance Criteria:**

- Tempo is aligned to the harmony BPM
- Pattern is loop-safe
- Velocity array always matches steps array length
- Swing value is non-zero for jazz, soul, and lo-fi genres
- P95 generation time ≤ 8 seconds

-----

### FR-006 · Arrangement Engine (New in v2.0)

**Purpose:** Generate a complete song structure that organizes compositions into a multi-section arrangement.

**Output Contract:**

```
ArrangementResult {
  sections: [
    {
      name:      "intro" | "verse" | "hook" | "bridge" | "outro"
      bars:      integer            // Duration in bars
      startBar:  integer
      endBar:    integer
      components: {
        melody:  boolean            // Melody present in this section
        bass:    boolean
        drums:   boolean
        chords:  boolean
        notes:   string             // e.g. "stripped-back drums, no melody"
      }
      energyLevel: number           // 0.0–1.0 (low to high)
    }
  ]
  totalBars:    integer
  sectionCount: integer
  energyArc:    number[]            // energyLevel per section, ordered
}
```

**Acceptance Criteria:**

- Minimum 3 sections returned; maximum 7 sections
- Energy arc rises from intro to hook; has at least one drop before outro
- Section bar counts are musically standard (intro: 4–8, verse: 8–16, hook: 8–16, bridge: 4–8, outro: 2–8)
- All sections have at least one component active

-----

### FR-007 · Composition Builder

**Purpose:** Combine harmony, melody, bass, rhythm, and arrangement outputs into a unified `Composition` object.

**Acceptance Criteria:**

- All five engine outputs are present and cross-referenced by BPM and key
- Composition object is fully serializable to JSON and to MIDI
- Builder fails loudly (throws `CompositionBuildError`) if any required engine result is missing or tempo-mismatched

-----

### FR-008 · MIDI Export

**Purpose:** Convert any composition component or full arrangement to standard MIDI files.

**Export Options:**

|Export Type     |File Name Pattern          |Tracks     |Channel                    |
|----------------|---------------------------|-----------|---------------------------|
|Melody          |`{project}-melody.mid`     |1          |Ch. 1                      |
|Chords          |`{project}-chords.mid`     |1          |Ch. 2                      |
|Bass            |`{project}-bass.mid`       |1          |Ch. 3                      |
|Drums           |`{project}-drums.mid`      |1          |Ch. 10 (GM)                |
|Full composition|`{project}-full.mid`       |4          |All above                  |
|Full arrangement|`{project}-arrangement.mid`|4 + markers|All above + section markers|

**Acceptance Criteria:**

- MIDI files pass MIDI 1.0 spec validation
- Files import without error into Ableton Live 11+, FL Studio 21+, Logic Pro 10.7+, Studio One 6+
- Arrangement MIDI includes a marker track with section names at correct bar positions
- Export completes within 5 seconds

-----

### FR-009 · Project Management

**Purpose:** Full CRUD + versioning for user projects.

|Operation      |Description                                  |
|---------------|---------------------------------------------|
|Create         |New project; optional initial composition    |
|Update         |Rename, re-tag                               |
|Soft Delete    |30-day recovery window                       |
|Hard Delete    |Irreversible; after 30-day window            |
|Save Snapshot  |Version the current composition + VCM state  |
|Load           |Restore full project including VCM grid state|
|List           |Paginated; sorted by updated                 |
|Versions       |History of up to 20 snapshots                |
|Restore Version|Roll back to a prior snapshot                |
|Auto-save      |Every 2 minutes during an active session     |

**Acceptance Criteria:**

- Project state restored exactly on reload: BPM, key, all tracks, grid mode, encoder values, timeline layout
- Version history retains last 20 snapshots
- Concurrent saves handled with optimistic locking (version counter)
- Auto-save triggers silently without interrupting playback

-----

### FR-010 · Producer Copilot

**Purpose:** AI-powered compositional analysis and actionable recommendations.

**Analysis Dimensions:**

|Dimension|What is evaluated                                                              |
|---------|-------------------------------------------------------------------------------|
|Melody   |Range, contour, rhythmic interest, repetition balance                          |
|Harmony  |Functional progression, tension/resolution, chord density                      |
|Rhythm   |Groove coherence, syncopation level, pattern variation, kick/snare relationship|
|Structure|Section balance, energy arc, intro/outro presence, build/drop dynamics         |
|Bass     |Frequency separation from kick, root motion, rhythmic lock to drums            |
|Energy   |Overall dynamic range, peak placement, crowd-energy potential                  |

**Output:**

```
CopilotAnalysis {
  overallScore:     integer       // 0–100
  dimensionScores: {
    melody, harmony, rhythm, structure, bass, energy: integer (0–100 each)
  }
  recommendations: [
    {
      dimension:  string
      severity:   "info" | "suggestion" | "warning"
      message:    string
      action:     string | null   // Machine-executable if present
      barRange:   [number, number] | null  // Where the issue occurs
    }
  ]
  styleMatch:       number        // 0.0–1.0
  grooveScore:      number        // 0.0–1.0
  energyArc:        number[]      // Energy level per section
}
```

**Acceptance Criteria:**

- Minimum 1 actionable recommendation per analysis
- Analysis completes within 5 seconds
- `barRange` populated for all positional recommendations
- Auto-apply available for: open hi-hat variation, transposition, section padding

-----

## 9. Functional Requirements — Virtual Composer Machine

### FR-011 · 8×8 Performance Grid

**Purpose:** A 64-pad WebGL-rendered grid surface that serves as the primary performance and interaction layer of the VCM.

**Grid Specifications:**

|Property            |Value                                                 |
|--------------------|------------------------------------------------------|
|Pad count           |64 (8 columns × 8 rows)                               |
|Render target       |Canvas / WebGL                                        |
|Target frame rate   |120 FPS                                               |
|Minimum frame rate  |60 FPS                                                |
|Pad color depth     |24-bit RGB per pad                                    |
|Color update latency|< 1 frame (~8ms at 120 FPS)                           |
|Velocity sensitivity|16 levels (mapped from pointer pressure or drag speed)|

**Grid Modes:**

|Mode          |ID         |Description                                    |Default Pad Layout                                |
|--------------|-----------|-----------------------------------------------|--------------------------------------------------|
|Piano Mode    |`piano`    |Chromatic note layout matching a piano keyboard|White/black key pattern across 64 pads            |
|Drum Rack Mode|`drum_rack`|16 drum pads with 4 banks of 16 (64 total)     |GM drum map Ch. 10; pads colored by category      |
|Chord Mode    |`chord`    |Each pad plays a full chord voicing            |Diatonic chords from current key fill pads        |
|Scale Mode    |`scale`    |Chromatic filtered to current key only         |All pads in-key; no chromatic pads                |
|Session Mode  |`session`  |Clip launch and loop management                |8 tracks × 8 slots; color = active/empty/playing  |
|Sequencer Mode|`sequencer`|Step sequencer; one row per instrument         |Row 1=kick, 2=snare, 3=HH, 4=bass, rows 5–8=melody|

**Acceptance Criteria:**

- All 6 modes render correctly at target frame rate on Chrome, Safari, Firefox
- Mode transitions complete in < 100ms without audio interruption
- Pad colors are visually distinct across modes
- Pad labels render in < 8px system font; readable at 100% browser zoom
- Grid responds to mouse/trackpad/touch; no keyboard-only interaction required for pad playing

-----

### FR-012 · Smart Touch Encoders

**Purpose:** 8 virtual rotary knobs that control audio and AI parameters in real time.

**Encoder Specifications:**

|Property      |Value                                            |
|--------------|-------------------------------------------------|
|Encoder count |8                                                |
|Value range   |0–127 (maps to 0.0–1.0 internally)               |
|Interaction   |Click-drag (vertical: up=increase, down=decrease)|
|Scroll support|Mouse wheel over encoder                         |
|Double-click  |Reset to default value                           |
|Value display |Label + current value shown on hover             |
|MIDI Learn    |Right-click → assign incoming CC                 |

**Default Encoder Assignments by Mode:**

|Encoder|Audio Mode        |AI Mode              |
|-------|------------------|---------------------|
|1      |Volume            |Complexity           |
|2      |Pan               |Harmonic Density     |
|3      |Filter Cutoff     |Melodic Range        |
|4      |Filter Resonance  |Rhythmic Density     |
|5      |Reverb Send       |Brightness           |
|6      |Delay Send        |Swing Amount         |
|7      |Instrument Macro 1|Style Match Threshold|
|8      |Instrument Macro 2|Variation Intensity  |

**Acceptance Criteria:**

- Encoder drag → parameter update within 2ms
- Audio parameters update without zipper noise or stepping artifacts
- AI parameters update composer preview without triggering a full regeneration
- Assignments persist per grid mode; switching modes updates labels but retains values

-----

### FR-013 · Timeline Engine

**Purpose:** A visual arrangement lane where users place, resize, reorder, and edit the sections of their song.

**Timeline Sections:**

|Section|Default Bars|Energy Level|Description                                        |
|-------|------------|------------|---------------------------------------------------|
|Intro  |4–8         |Low         |Sparse entry; establishes key and BPM              |
|Verse  |8–16        |Medium      |Main lyrical or melodic content                    |
|Hook   |8–16        |High        |The most energetic section; main hook melody       |
|Bridge |4–8         |Medium-Low  |Contrast section; often drops drum or chord element|
|Outro  |2–8         |Low         |Resolution and fade                                |

**Interactions:**

|Interaction               |Behavior                                              |
|--------------------------|------------------------------------------------------|
|Drag section edge         |Resize bar count; real-time label update              |
|Drag section header       |Reorder sections; audio reflects new order            |
|Drag composition from grid|Place composition into a section slot                 |
|Right-click section       |Context menu: Duplicate, Clear, Auto-Fill with AI     |
|Click section             |Select; load its composition into the grid for editing|
|Double-click section      |Rename section                                        |

**Acceptance Criteria:**

- Timeline renders all populated sections in correct order
- Drag operations complete within 1 frame (< 8ms) with no visible lag
- Audio playback reflects arrangement order in real time
- Auto-Arrange button populates all 5 sections using Arrangement Agent output; respects locked sections
- Minimum 1 bar per section enforced; UI prevents resizing below this

-----

### FR-014 · AI Performance Mode

**Purpose:** Generate musical variations in real time without overwriting the creator’s existing work.

**Generate Variation Targets:**

|Target         |Description                             |Lockable|
|---------------|----------------------------------------|--------|
|New Melody     |Regenerate lead melody only             |Yes     |
|New Groove     |Regenerate drum + bass pattern          |Yes     |
|New Arrangement|Restructure section order and bar counts|Yes     |
|New Chords     |Regenerate chord progression (keep key) |Yes     |
|Full Variation |Regenerate all unlocked components      |—       |

**Workflow:**

1. User clicks “Generate Variation”
1. System auto-saves current state as a version snapshot before generating
1. Variation is generated using LLPTE pipeline
1. New state loaded into grid and timeline
1. “Undo Variation” restores previous snapshot in one click

**Acceptance Criteria:**

- Original state always snapshotted before variation generation
- Variation respects all locked components
- “Undo Variation” available immediately after generation completes
- Variation generation completes within 15 seconds (P95)
- UI is non-blocking during generation; spinner shown; grid remains playable

-----

### FR-015 · AI Jam Mode

**Purpose:** Real-time AI accompaniment that responds to user pad input with bass, drums, and fill.

**Jam Mode Behavior:**

|Event               |AI Response                                  |Latency Target|
|--------------------|---------------------------------------------|--------------|
|User plays chord pad|AI adds bass line for that chord             |< 200ms       |
|User plays drum pad |AI adds complementary groove fills           |< 200ms       |
|User changes chord  |AI transitions bass/groove to new chord      |< 100ms       |
|User stops playing  |AI loops current groove for 2 bars then fades|—             |

**Musical Rules:**

- All AI responses are diatonic to the locked key
- AI responses match the current BPM
- AI never interrupts a user-initiated note; it fills gaps
- AI Jam layer is recorded separately from user input

**Acceptance Criteria:**

- Jam Mode activatable with a single button press
- AI response starts within 200ms of first pad input
- AI and user layers are independently mutable (separate mixer channels)
- Jam session recordable as a composition

-----

### FR-016 · Chord Memory

**Purpose:** Store and instantly recall full chord voicings from individual pads.

**Behavior:**

- In Chord Mode, each pad is pre-loaded with a diatonic chord from the current key
- User can customize any pad: hold pad → chord name input → chord assigned
- Playing a Chord Memory pad triggers all notes of the chord simultaneously
- Chord velocity is mapped from pointer pressure or velocity-drag sensitivity
- Chord labels displayed on pad face at all times

**Acceptance Criteria:**

- Pre-loaded chords are harmonically correct for the current key and scale
- Custom chord assignment takes effect within 200ms
- Multiple Chord Memory pads playable simultaneously (polyphonic)
- Chord labels remain readable at 120 FPS with RGB animation active

-----

### FR-017 · Smart Scale Mode

**Purpose:** Prevent wrong notes by filtering the grid to in-key pitches only.

**Behavior:**

- When Smart Scale Mode is active, all grid pads in Piano Mode and Scale Mode play only notes from the current key’s scale
- Chromatic notes are visually dimmed and unresponsive to input
- If a hardware MIDI keyboard is connected, incoming notes outside the scale are quantized to the nearest in-key note
- Scale Mode can be toggled per-mode without affecting other modes

**Supported Scales:** Major, Natural Minor (Aeolian), Harmonic Minor, Melodic Minor, Dorian, Phrygian, Lydian, Mixolydian, Pentatonic Major, Pentatonic Minor, Blues

**Acceptance Criteria:**

- No out-of-key notes ever trigger audio when Smart Scale Mode is active
- Hardware MIDI quantization adds ≤ 1ms additional latency
- Scale selection visible in header at all times
- Scale changes immediately update pad layout without audio interruption

-----

### FR-018 · MIDI Input / Output / Learn

**Purpose:** Bidirectional MIDI integration with hardware devices via the Web MIDI API.

**MIDI Input:**

- Hardware MIDI keyboard drives VCM audio engine in current grid mode
- MIDI note-on → pad highlights and audio plays within 5ms
- MIDI velocity passed through to audio engine

**MIDI Output:**

- VCM pad events transmitted as MIDI note-on/off on correct channels
- Enables hardware synth modules to play VCM performances in real time
- MIDI clock transmitted at current BPM for hardware sync

**MIDI Learn:**

- Right-click any encoder or button → “MIDI Learn”
- Next incoming CC value assigns to that control
- MIDI Learn mapping is saved with the project

**MIDI Export:** (see FR-008)

**Acceptance Criteria:**

- Web MIDI API device discovery on page load; user prompted to grant permission
- MIDI input → audio: ≤ 5ms additional latency (on top of base audio latency)
- MIDI output correct: no orphaned note-ons; note-off always follows note-on
- MIDI Learn assignments persist across page reload

-----

## 10. Non-Functional Requirements

### Performance

|Requirement               |Target      |Hard Limit   |
|--------------------------|------------|-------------|
|Composition generation P50|< 5 seconds |—            |
|Composition generation P95|< 10 seconds|30 seconds   |
|MIDI export               |< 5 seconds |—            |
|Copilot analysis          |< 5 seconds |—            |
|API response (non-AI)     |< 300ms     |1 second     |
|Grid render rate          |≥ 120 FPS   |Floor: 60 FPS|
|Pad-to-audio latency P95  |< 10ms      |20ms         |
|Encoder-to-audio latency  |< 2ms       |5ms          |
|Grid mode switch          |< 100ms     |200ms        |
|AI Jam Mode response      |< 200ms     |500ms        |
|Hardware MIDI → audio     |< 15ms total|30ms         |

### Availability & Reliability

|Requirement       |Target                               |
|------------------|-------------------------------------|
|API uptime        |≥ 99.5%                              |
|RTO               |< 1 hour                             |
|RPO               |< 5 minutes                          |
|Auto-save interval|Every 2 minutes during active session|

### Scalability

|Requirement                           |Target|
|--------------------------------------|------|
|Concurrent active users               |10,000|
|Compositions generated per hour       |50,000|
|VCM grid sessions concurrent          |10,000|
|WebSocket connections (real-time sync)|10,000|

### Browser Compatibility

|Browser      |Minimum Version|Notes                                  |
|-------------|---------------|---------------------------------------|
|Chrome       |110+           |Primary target; WebGL 2.0, Web MIDI API|
|Firefox      |110+           |WebGL 2.0; Web MIDI requires extension |
|Safari       |16.4+          |WebGL 2.0; Web MIDI limited            |
|Edge         |110+           |Chromium-based; full support           |
|Mobile Chrome|110+           |Touch events; reduced MIDI support     |

### Audio Performance

|Requirement                |Value                                  |
|---------------------------|---------------------------------------|
|Audio context sample rate  |44,100 Hz or 48,000 Hz (device default)|
|Audio buffer size          |128 samples (preferred); 256 fallback  |
|Maximum simultaneous voices|32 polyphonic voices                   |
|AudioWorklet required      |Yes (no ScriptProcessorNode)           |

-----

## 11. Data Requirements

### Core Entities

|Entity                 |Description                                                              |
|-----------------------|-------------------------------------------------------------------------|
|`users`                |Authentication, profile, preferences                                     |
|`projects`             |Named containers                                                         |
|`compositions`         |Single generation result (harmony + melody + bass + rhythm + arrangement)|
|`tracks`               |Individual instrument lanes                                              |
|`exports`              |MIDI export records                                                      |
|`style_profiles`       |Saved genre/mood/BPM preference sets                                     |
|`composition_versions` |Project state snapshots                                                  |
|`vcm_states`           |Grid mode, encoder values, session layout, MIDI mappings                 |
|`timeline_arrangements`|Section layout: bars, order, energy, components                          |
|`timeline_sections`    |Individual section rows in an arrangement                                |
|`jam_sessions`         |Recorded AI Jam Mode performances                                        |
|`midi_mappings`        |MIDI Learn assignments per project                                       |
|`audit_logs`           |Immutable mutation log                                                   |

### Data Retention

|Data Type            |Retention                 |
|---------------------|--------------------------|
|Active projects      |Indefinite                |
|Soft-deleted projects|30 days                   |
|Export files         |90 days                   |
|Jam sessions         |60 days                   |
|VCM state snapshots  |20 most recent per project|
|Audit logs           |365 days                  |

-----

## 12. AI Requirements

### Agent Architecture

|Agent                |Responsibilities                               |New in v2|
|---------------------|-----------------------------------------------|---------|
|**Harmony Agent**    |Key selection, BPM inference, chord progression|No       |
|**Melody Agent**     |Lead melodies, hook variations                 |No       |
|**Bass Agent**       |Root motion, melodic bass, 808 sub             |**Yes**  |
|**Rhythm Agent**     |Drum patterns, groove, swing                   |No       |
|**Arrangement Agent**|Song structure, section energy arc             |**Yes**  |
|**Analysis Agent**   |Composition evaluation, Copilot recommendations|Extended |
|**Jam Agent**        |Real-time accompaniment for Jam Mode           |**Yes**  |

### Jam Agent (New)

The Jam Agent is a lightweight, low-latency agent that runs on a 200ms inference budget. It operates continuously during Jam Mode sessions and responds to chord/pad events.

- Model: `claude-haiku-4-5` (fast; low-latency) for real-time responses
- Context: Current key, BPM, chord being played, last 4 bars of user input
- Output: 1–2 bar bass/drum fill in JSON; streamed, not awaited
- No retry on failure; missed responses are silently skipped

### Confidence Gating

- Compositions below 0.65 style-match confidence → `lowConfidence: true` → UI shows regeneration prompt
- Jam Agent responses that fail schema validation are silently dropped; no user-facing error
- Arrangement Agent below 0.70 confidence → Copilot flags arrangement for review

### Agent Timeouts

|Agent      |P95 Target|Hard Timeout|
|-----------|----------|------------|
|Harmony    |8s        |15s         |
|Melody     |8s        |15s         |
|Bass       |6s        |12s         |
|Rhythm     |6s        |12s         |
|Arrangement|10s       |20s         |
|Analysis   |5s        |10s         |
|Jam        |200ms     |500ms       |

-----

## 13. Audio Engine Requirements

### Core Stack

|Component    |Technology                                    |
|-------------|----------------------------------------------|
|Audio runtime|Tone.js (wraps Web Audio API)                 |
|Synthesis    |Tone.js Sampler + PolySynth                   |
|Effects      |Tone.js Reverb, Delay, Filter, Compressor, EQ3|
|Sequencer    |Tone.js Transport + Part                      |
|MIDI I/O     |Web MIDI API (`navigator.requestMIDIAccess`)  |
|AudioWorklet |Custom DSP nodes for <10ms pad latency        |

### Instrument Channels

|Track  |Tone.js Instrument        |MIDI Channel|
|-------|--------------------------|------------|
|Melody |PolySynth (Synth × 4)     |Ch. 1       |
|Chords |PolySynth (Synth × 8)     |Ch. 2       |
|Bass   |Synth + OmniOscillator    |Ch. 3       |
|Kick   |MembraneSynth             |Ch. 10      |
|Snare  |NoiseSynth + MembraneSynth|Ch. 10      |
|Hi-Hat |MetalSynth                |Ch. 10      |
|Clap   |NoiseSynth                |Ch. 10      |
|Open HH|MetalSynth (sustained)    |Ch. 10      |

### Audio Requirements

- Audio context must be created on user gesture (browser autoplay policy)
- Latency hint: `"interactive"` on `AudioContext` creation
- Buffer size: 128 samples preferred; 256 if `latencyHint` not honored
- All effects are channel-insert (not global bus) to enable per-track bypass
- Audio engine state must serialize to JSON for project save/restore

-----

## 14. MIDI Requirements

### Web MIDI API

|Requirement       |Detail                                          |
|------------------|------------------------------------------------|
|Permission request|On first session; graceful degradation if denied|
|Device discovery  |Enumerate inputs and outputs on connection      |
|Hot-plug          |Devices connected after page load are detected  |
|Input processing  |Note-on, note-off, CC; ignore SysEx by default  |
|Output channels   |Match VCM track channel assignments             |
|MIDI clock output |Transmit at current Tone.js Transport BPM       |

### MIDI Learn Protocol

1. User right-clicks control → selects “MIDI Learn”
1. Control enters learn state (highlighted in UI)
1. System listens for next incoming CC or note
1. Control assigned to that CC/note
1. Mapping saved to `midi_mappings` table

### MIDI Export Spec

- MIDI format: Type 1 (multi-track)
- Tempo map: Type 1 tempo meta event at tick 0
- Time division: 480 PPQ (pulses per quarter note)
- Track names: “Melody”, “Chords”, “Bass”, “Drums”, “Arrangement Markers”
- Section markers: Marker meta events at correct tick positions
- Note durations: Quantized to nearest 16th note

-----

## 15. Analytics Requirements

### Events to Track

|Event                      |Properties                                                  |
|---------------------------|------------------------------------------------------------|
|`composition.generated`    |userId, compositionId, genre, mood, generationMs, agentsUsed|
|`composition.failed`       |userId, errorCode, generationMs                             |
|`vcm.grid_mode_changed`    |userId, fromMode, toMode                                    |
|`vcm.pad_tapped`           |userId, padIndex, gridMode, velocity                        |
|`vcm.encoder_moved`        |userId, encoderId, encoderLabel, direction                  |
|`vcm.jam_mode_started`     |userId, projectId                                           |
|`vcm.jam_mode_ended`       |userId, durationSeconds, chordsPlayed                       |
|`vcm.variation_generated`  |userId, lockedComponents, generationMs                      |
|`timeline.section_arranged`|userId, sectionName, barCount                               |
|`timeline.auto_arranged`   |userId, projectId, sectionCount                             |
|`export.midi_exported`     |userId, exportType, fileSizeBytes                           |
|`copilot.analyzed`         |userId, overallScore, analysisMs                            |
|`project.auto_saved`       |userId, projectId                                           |
|`midi.device_connected`    |userId, deviceName, direction                               |

### Dashboards

- Generation success rate and latency (24h rolling)
- Grid mode usage breakdown (pie)
- Jam Mode session count and average duration
- MIDI export volume by type
- Error rate by code
- P50/P95 generation time trend (7d)
- DAU / WAU / MAU

-----

## 16. Error Handling

### Error Response Schema

```json
{
  "error": {
    "code":    "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "traceId": "uuid"
  }
}
```

### Error Codes

|Code                    |HTTP|Trigger                                |
|------------------------|----|---------------------------------------|
|`INVALID_REQUEST`       |400 |Validation failure                     |
|`UNAUTHORIZED`          |401 |Missing or expired JWT                 |
|`FORBIDDEN`             |403 |Authenticated but lacking permission   |
|`NOT_FOUND`             |404 |Resource does not exist                |
|`CONFLICT`              |409 |Optimistic lock version mismatch       |
|`RATE_LIMITED`          |429 |Exceeds rate limit                     |
|`GENERATION_FAILED`     |500 |AI pipeline error                      |
|`EXPORT_FAILED`         |500 |MIDI serialization error               |
|`ARRANGEMENT_FAILED`    |500 |Arrangement Agent error                |
|`JAM_AGENT_FAILED`      |500 |Jam Agent error (silent; no user alert)|
|`AUDIO_ENGINE_ERROR`    |500 |Tone.js / AudioContext error           |
|`MIDI_PERMISSION_DENIED`|403 |Web MIDI API permission denied         |
|`INTERNAL_SERVER_ERROR` |500 |Unhandled exception                    |

### Client-Side Error Handling

|Error Type            |UI Treatment                                                     |
|----------------------|-----------------------------------------------------------------|
|Generation failure    |Toast: “Generation failed. Tap to retry.” — retains form values  |
|Validation error      |Inline field error below the offending input                     |
|Rate limit            |Toast with countdown: “Generation available in 45s”              |
|Audio context blocked |Banner: “Tap anywhere to enable audio”                           |
|MIDI permission denied|Non-blocking info banner; MIDI features gracefully hidden        |
|Auto-save failure     |Silent retry × 3; then banner: “Auto-save failed. Save manually.”|

-----

## 17. Testing Requirements

### Unit Testing

|Requirement  |Target                                       |
|-------------|---------------------------------------------|
|Code coverage|≥ 80%                                        |
|Framework    |Vitest                                       |
|AI agents    |Mocked Anthropic responses; no live API in CI|
|Audio engine |Mocked Tone.js context; test scheduling logic|
|MIDI engine  |Mocked Web MIDI API                          |

### Integration Testing

|Module           |Key Scenarios                                                                |
|-----------------|-----------------------------------------------------------------------------|
|Composer pipeline|Full generation: harmony → melody → bass → rhythm → arrangement → composition|
|VCM grid         |All 6 mode transitions; pad event dispatch; encoder value propagation        |
|Audio engine     |Tone.js sequencer start/stop; instrument trigger; effect chain               |
|MIDI             |Input routing to audio engine; output channel correctness; Learn assignment  |
|Projects         |CRUD; versioning; VCM state save/restore                                     |
|Exports          |All 6 export types; MIDI validation; file size bounds                        |
|Timeline         |Section CRUD; drag-reorder; auto-arrange                                     |

### End-to-End Testing (Playwright)

|Scenario          |Description                                                               |
|------------------|--------------------------------------------------------------------------|
|Full composer flow|Register → Create project → Prompt → Generate → Export MIDI               |
|VCM grid play     |Open VCM → Switch to Drum Rack → Tap 8 pads → Assert audio events fired   |
|Chord Memory      |Open Chord Mode → Tap chord pad → Assert all chord MIDI notes triggered   |
|Smart Scale       |Enable Scale Mode → Tap non-scale pad position → Assert no audio triggered|
|Jam Mode          |Start Jam → Play chords → Assert AI accompaniment starts within 200ms     |
|Timeline arrange  |Auto-arrange → Drag section → Export arrangement MIDI                     |
|Project reload    |Save project → Reload page → Assert exact state restoration               |

### Performance Testing

- Load test: 500 concurrent generation requests; P95 ≤ 10 seconds
- Grid render test: 60 simultaneous grid instances in headless Chrome; ≥ 60 FPS
- Audio latency test: 100 pad taps measured; P95 < 10ms pad-to-audio
- MIDI roundtrip: 100 MIDI note-on events; P95 < 15ms end-to-end

### DAW Export Validation

Before each release:

- Export a 4-track composition MIDI from the test suite
- Import into Ableton Live 11, FL Studio 21, Logic Pro 10.7, Studio One 6
- Assert: correct tempo, correct channels, no orphaned note-ons, section markers visible

-----

## 18. Security Requirements

|Requirement     |Implementation                                                    |
|----------------|------------------------------------------------------------------|
|Authentication  |JWT (`r3_token`); 7-day access + 30-day refresh                   |
|Password storage|Argon2id                                                          |
|Authorization   |RBAC: `user` / `admin`                                            |
|Input validation|Zod on all tRPC procedures; no raw SQL string interpolation       |
|Rate limiting   |100 req/min general; 10 req/min generation; Redis-backed          |
|Transport       |HTTPS; HSTS max-age 1 year                                        |
|CORS            |Origin whitelist; no wildcard in production                       |
|Secrets         |Environment variables only; never in source                       |
|Audit logging   |All write operations: userId, IP, timestamp, traceId              |
|MIDI data       |MIDI input processed client-side; no raw MIDI data sent to server |
|Audio data      |Audio processing client-side only; no audio sent to server in v1.0|
|Dependency SLA  |Critical/High CVE ≤ 30 days; Medium ≤ 90 days                     |

-----

## 19. Accessibility Requirements

|Requirement        |Detail                                                                      |
|-------------------|----------------------------------------------------------------------------|
|Keyboard navigation|All non-grid controls (project, export, copilot) fully keyboard-navigable   |
|Grid keyboard mode |Grid playable via keyboard row-mapping as an alternative to pointer         |
|Screen reader      |All buttons and inputs have ARIA labels; live regions for composition status|
|Color independence |Pad states communicated via shape/label, not color alone                    |
|Focus indicators   |Visible focus rings on all interactive elements                             |
|Reduced motion     |CSS `prefers-reduced-motion` respected; grid animations suppressible        |
|WCAG target        |2.1 AA for all non-grid UI                                                  |

-----

## 20. Release Scope

### Phase 1 (Weeks 1–8) — Intelligent Composer

|Feature                        |Priority|Status |
|-------------------------------|--------|-------|
|Prompt input + validation      |P0      |Planned|
|Harmony Engine                 |P0      |Planned|
|Melody Engine                  |P0      |Planned|
|Bass Engine                    |P0      |Planned|
|Rhythm Engine                  |P0      |Planned|
|Arrangement Engine             |P0      |Planned|
|Composition Builder            |P0      |Planned|
|MIDI Export (all types)        |P0      |Planned|
|Project Management + versioning|P0      |Planned|
|Producer Copilot               |P1      |Planned|
|Style Preferences              |P1      |Planned|
|Auth + RBAC                    |P0      |Planned|

### Phase 2 (Weeks 9–12) — Virtual Composer Machine

|Feature                                        |Priority|Status |
|-----------------------------------------------|--------|-------|
|8×8 WebGL Grid (all 6 modes)                   |P0      |Planned|
|Smart Touch Encoders (8)                       |P0      |Planned|
|Timeline Engine (5 sections)                   |P0      |Planned|
|AI Performance Mode                            |P0      |Planned|
|AI Jam Mode                                    |P1      |Planned|
|Chord Memory                                   |P1      |Planned|
|Smart Scale Mode                               |P1      |Planned|
|MIDI Input / Output                            |P1      |Planned|
|MIDI Learn                                     |P1      |Planned|
|Transport Controls (Play/Stop/Record/Undo/Redo)|P0      |Planned|
|VCM State Save/Restore                         |P0      |Planned|

### Explicitly Excluded from v1.0+VCM

|Feature                                       |Reason for Exclusion              |
|----------------------------------------------|----------------------------------|
|Voice-to-MIDI                                 |Audio capture infrastructure; v2  |
|Hum-to-MIDI                                   |Pitch detection model; v2         |
|Real-time collaboration on VCM                |Session sync complexity; v3       |
|Hardware controller firmware (physical device)|Out of scope for software product |
|Audio rendering (wav/mp3)                     |Audio engine; v4                  |
|VST/AU plugin wrapper                         |DAW integration layer; v3         |
|Mobile app (iOS/Android)                      |Web-first; v3                     |
|Custom AI model training                      |Infrastructure cost; premature; v4|
|Marketplace                                   |Insufficient user base; v3        |

-----

## 21. Risks & Mitigations

|Risk                                   |P     |Impact  |Mitigation                                                               |
|---------------------------------------|------|--------|-------------------------------------------------------------------------|
|Scope expansion                        |High  |High    |Hard MVP boundary; PRD amendment required for any addition               |
|AI output quality                      |Medium|High    |Human-in-the-loop; 0.65 confidence gate; user regeneration               |
|MIDI compatibility across DAWs         |Low   |Medium  |Automated DAW validation test suite before each release                  |
|WebGL performance on low-end hardware  |Medium|High    |Fallback Canvas 2D renderer; graceful degradation to 60 FPS              |
|Web Audio latency on Safari            |Medium|Medium  |Test suite on Safari; AudioWorklet polyfill; user latency warning        |
|Web MIDI API browser support gaps      |Low   |Medium  |Graceful MIDI feature degradation; “MIDI unavailable” non-blocking banner|
|Jam Agent latency exceeds 200ms        |Medium|Medium  |haiku model selection; streaming response; silent skip on timeout        |
|Third-party AI API (Anthropic) downtime|Low   |High    |Circuit breaker; retry with backoff; user-facing “AI unavailable” state  |
|Tone.js memory leaks in long sessions  |Medium|Medium  |Disposal testing; 30-minute soak test in CI                              |
|Performance degradation at scale       |Medium|Medium  |Load test at 2× expected; Redis caching; auto-scaling                    |
|Data loss                              |Low   |Critical|Daily backups; WAL archiving; RPO < 5 minutes                            |
|Concurrent save conflicts              |Medium|Medium  |Optimistic locking; conflict resolution UI                               |

-----

## 22. Definition of Done

**Phase 1 (Composer) is complete when:**

- [ ] All FR-001 through FR-010 acceptance criteria pass
- [ ] Unit test coverage ≥ 80%
- [ ] All integration and E2E test scenarios pass
- [ ] Security review: no Critical or High open findings
- [ ] MIDI export validated in all 4 target DAWs
- [ ] P95 generation ≤ 10 seconds at 500 concurrent users (load test)
- [ ] Documentation: API reference, user guide, deployment runbook
- [ ] Monitoring enabled for all P0 metrics
- [ ] 5 beta users completed prompt → generate → export without developer help
- [ ] `pnpm tsc --noEmit` passes; no `any`; no `console.log`

**Phase 2 (VCM) is additionally complete when:**

- [ ] All FR-011 through FR-018 acceptance criteria pass
- [ ] Grid renders at ≥ 120 FPS on Chrome 110+ (benchmark machine: Intel i5, 8GB RAM)
- [ ] Pad-to-audio latency P95 < 10ms (measured on same benchmark machine)
- [ ] All 6 grid modes tested on Chrome, Firefox, Safari
- [ ] MIDI input and output validated with 2 hardware devices
- [ ] AI Jam Mode response < 200ms in P95 (measured)
- [ ] VCM state save/restore tested: all 6 modes, encoder values, timeline layout restored exactly
- [ ] Timeline auto-arrange generates valid 5-section arrangement 100% of the time
- [ ] 5 additional beta users completed VCM-specific flow: jam → record → arrange → export
- [ ] Web Audio latency warning shown on Safari with a link to audio settings

-----

## 23. Future Roadmap

### Version 2 · Expanded Intelligence (Months 4–9)

- Voice-to-MIDI (hum or sing into mic; convert to MIDI notes)
- Arrangement AI improvements (genre-specific structure templates)
- Enhanced Copilot with one-click auto-apply of all suggestions
- Style learning (Copilot learns user’s preferred genre/style from session history)
- Stem separation for external audio import
- Mobile-optimized VCM (touch-native grid, swipe encoders)

### Version 3 · Social & Ecosystem (Months 10–18)

- Real-time collaboration (shared VCM sessions, multiplayer pad control)
- Marketplace (sell/buy style profiles, chord sets, drum kits)
- Plugin ecosystem (VST/AU wrapper; embed R3 Composer into any DAW)
- Mobile application (iOS and Android; full VCM with haptic feedback)
- Export to Ableton Live Set (.als) and FL Studio Project (.flp)

### Version 4 · Audio Layer (Months 18–30)

- Audio rendering: export composition as wav/mp3
- Stem export per instrument
- AI mixing: level balancing, EQ, compression suggestions
- Vocal processing chain: pitch correction, dynamic EQ, de-essing, reverb
- Sample import: drag wav files onto pads in Drum Rack Mode

### Version 5 · Music Operating System (Year 3+)

- Personalized composer models trained on user’s project history
- Autonomous agent ecosystem: multi-agent session management
- Real-time hardware sync: Ableton Link integration
- Live streaming: broadcast VCM performance to Twitch/YouTube directly from R3
- R3 as a full Music OS: replace DAW, hardware, and distribution tools in one

-----

## 24. Appendix A — Grid Mode Reference

### Piano Mode — Pad Layout (8×8)

```
Row 8: C6  D6  E6  F6  G6  A6  B6  C7
Row 7: F5  G5  A5  Bb5 C6  D6  E6  F6
Row 6: C5  D5  E5  F5  G5  A5  B5  C6
Row 5: G4  A4  B4  C5  D5  E5  F5  G5
Row 4: C4  D4  E4  F4  G4  A4  B4  C5
Row 3: G3  A3  B3  C4  D4  E4  F4  G4
Row 2: C3  D3  E3  F3  G3  A3  B3  C4
Row 1: G2  A2  B2  C3  D3  E3  F3  G3
```

White key pads: light gray. Black key pads: dark gray. Active note: accent color pulse.

### Drum Rack Mode — Pad Layout (16 pads active)

```
Row 2, Cols 1–8: Open HH | Ride    | Crash  | Perc 1 | Perc 2 | Perc 3 | Tom 1  | Tom 2
Row 1, Cols 1–8: Kick    | Snare   | Cl. HH | Clap   | Rim    | Cowbell| Shaker | Tambourine
```

Banks 2–4 (rows 3–8) extend to 64 assignable drum slots.

### Chord Mode — Default Layout (Key of C Major)

```
Row 8: Cmaj9  Dm9    Em7   Fmaj9  G9     Am9    Bm7b5  Cmaj7
Row 7: Csus2  Dsus2  Esus4 Fsus2  Gsus4  Asus2  Bsus4  Csus4
Row 6: C6    Dm6    Em    Fmaj7  G7     Am7    Bdim   Cadd9
Row 5: Cmaj  Dm     Em    Fmaj   Gmaj   Am     Bdim   Cmaj (oct)
...
```

(Layout recomputes when key changes.)

### Sequencer Mode — Row Assignments

```
Row 8: Melody   (16 steps, Ch. 1, current scale)
Row 7: Hook     (16 steps, Ch. 1)
Row 6: Bass     (16 steps, Ch. 3)
Row 5: Chord    (16 steps, Ch. 2)
Row 4: Kick     (16 steps, Ch. 10)
Row 3: Snare    (16 steps, Ch. 10)
Row 2: Hi-Hat   (16 steps, Ch. 10)
Row 1: Open HH  (16 steps, Ch. 10)
```

Playhead advances left-to-right; illuminated green. Active steps: accent color. Inactive: dim.

-----

## 25. Appendix B — Agent Output Schemas

All agent outputs are validated with Zod before storage. Schema versions are tracked in the `schema_version` column of the `compositions` table.

### SchemaVersion 1 — Current

```typescript
// packages/shared/src/schemas/composition.ts

export const HarmonyResultSchema = z.object({ ... })
export const MelodyResultSchema  = z.object({ ... })
export const BassResultSchema    = z.object({ ... })
export const DrumPatternSchema   = z.object({ ... })
export const ArrangementSchema   = z.object({ ... })

export const CompositionSchema = z.object({
  id:           z.string().uuid(),
  key:          z.string(),
  bpm:          z.number().int().min(60).max(200),
  timeSignature:z.enum(['4/4','3/4','6/8']),
  harmony:      HarmonyResultSchema,
  melodies:     z.array(MelodyResultSchema).min(1),
  bass:         BassResultSchema,
  drums:        DrumPatternSchema,
  arrangement:  ArrangementSchema,
  createdAt:    z.string().datetime(),
})
```

Breaking changes to any agent schema increment `schema_version` and require a migration path in `packages/ai/src/migrations/`.