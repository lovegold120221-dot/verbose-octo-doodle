# GeneratingOverlay Component

A reusable full-page generation/loading overlay used for all task-generation flows.

## Location

- `src/components/GeneratingOverlay.tsx`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | optional | Close handler |

## Usage

```tsx
import { GeneratingOverlay } from './components/GeneratingOverlay';

<GeneratingOverlay
  open={isGenerating}
  onClose={() => setIsGenerating(false)}
/>
```

## Behavior

- Displays a sticky header with close icon
- Shows animated "Generating..." title with pulsing dots
- Animated horizontal sweep line inside a progress bar
- Terminal-style logs appear progressively (10 generic log lines)
- Logs are generic process simulation logs (no task-specific text)
- The component is generic — text is always "Generating..."

## Integrated Flows

The overlay is automatically used in these flows:

- **Task generation** — when `tryTriggerComputerTask` is invoked
- **Document creation** — when the `create_document` tool is called
- **Session connecting** — when the Gemini Live session is starting
- **Admin Portal save/test** — when credentials are saved or tested

Log lines (hardcoded in component):

```
[00:00:01] init runtime session prepared
[00:00:02] queue task accepted into pipeline
[00:00:03] scan context synchronized
[00:00:04] ok input structure validated
[00:00:05] build generation pipeline active
[00:00:06] stream intermediate output buffered
[00:00:07] wait processing next segment
[00:00:08] merge segments composed
[00:00:09] refine output stabilized
[00:00:10] sync final pass running
```
