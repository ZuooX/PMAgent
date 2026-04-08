# PM Agent

AI-powered Product Manager workflow toolkit — guides PMs from requirement alignment through prototype generation to PRD delivery.

## Overview

PM Agent is a collection of Cursor rules and supporting scripts that create an AI-assisted workflow covering:

| Phase | Description | Command |
|-------|-------------|---------|
| Phase 0 | Context management | `新需求` |
| Phase 1 | Requirement alignment & constraints | `需求对齐` |
| Phase 2 | User scenarios & feature list | `场景推演` |
| Phase 3 | Detailed design & state machines | `详细设计` |
| Phase 4 | Interactive prototype generation | `出原型` |
| Phase 5 | PRD assembly | `出需求稿` |
| Phase 5.5 | Review checklist | `需求评审` |
| Phase 6 | Change synchronization | `修改需求` |
| Phase 7 | Release infographic | `生成汇报图` |

## Project Structure

```
PMAgent/
├── .cursor/rules/              # 9 workflow rule files (.mdc)
│   ├── pm-router.mdc           # Dispatcher — always on
│   ├── pm-context.mdc          # Phase 0: context management
│   ├── pm-alignment.mdc        # Phase 1: requirement alignment
│   ├── pm-scenarios.mdc        # Phase 2: scenarios & features
│   ├── pm-detail-design.mdc    # Phase 3: detailed design
│   ├── generateui.mdc          # Phase 4: prototype generation
│   ├── pm-prd-output.mdc       # Phase 5: PRD assembly
│   ├── pm-review-checklist.mdc # Phase 5.5 + 6: review & change sync
│   └── pm-release-infographic.mdc # Phase 7: release infographic
│
├── templates/prd/              # 7 PRD template files (.tpl.md)
│   ├── prd-full.tpl.md
│   ├── detail-design-page.tpl.md
│   ├── user-scenarios.tpl.md
│   ├── project-context.tpl.md
│   ├── requirement-background.tpl.md
│   ├── feature-inventory.tpl.md
│   └── review-checklist.tpl.md
│
├── projects/                   # Your project data goes here
│   └── <project-name>/
│       ├── project-context.md
│       ├── feature-inventory.md
│       └── sprints/
│           └── <version>/
│               ├── requirement.md
│               ├── changelog.md
│               └── review-notes.md
│
├── output/                     # Generated prototypes
│   ├── manifest.json           # Page registry
│   └── index.html              # Auto-generated overview (run build:output-index)
│
├── build-prd-preview.mjs       # Build PRD HTML preview
├── build-output-index.mjs      # Build prototype index page
├── snapshot-prototypes.mjs     # Capture prototype screenshots
└── pm-agent-dashboard.html     # Workflow overview dashboard
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Open in Cursor

Open this directory as a Cursor workspace. The rules in `.cursor/rules/` activate automatically.

### 3. Start a new project

In Cursor chat, type:

```
新需求
```

The AI will guide you through setting up your project context and beginning requirement alignment.

### 4. Quick commands

| Command | Action |
|---------|--------|
| `新需求` | Start a new requirement |
| `场景推演` | User scenario analysis |
| `详细设计` | Detailed design phase |
| `出原型` | Generate interactive prototype |
| `出需求稿` | Assemble full PRD |
| `需求评审` | Run review checklist |
| `修改需求` | Change sync after review |
| `生成汇报图` | Generate release infographic |

### 5. Build tools

```bash
# Generate PRD HTML preview
node build-prd-preview.mjs projects/<name>/sprints/<version>/requirement.md

# Rebuild prototype index
node build-output-index.mjs

# Capture prototype screenshots
node snapshot-prototypes.mjs output/<project>/<version>
```

## Dashboard

Open `pm-agent-dashboard.html` in a browser for a visual overview of the full workflow, phase descriptions, and quick command reference.

## As a Global Cursor Skill

This project is also packaged as a global Cursor Skill at `~/.cursor/skills/pm-agent/`. The skill makes PM Agent available in any Cursor workspace — just copy the `.cursor/rules/` and `templates/` directories to your new project when needed.
