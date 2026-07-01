# AI Settings Voice Command TTS Update Plan

## Main Instruction

Update the existing **AI Settings > Voice Command** tab only. Do not delete or change existing logic, layout, sidebar, header, colors, or current voice command behavior. Just add and improve the Text-to-Speech voice selection feature.

## Goal

Replace/improve the current built-in Text-to-Speech with Microsoft Edge TTS support, but keep the browser built-in `speechSynthesis` as fallback in case Edge TTS fails.

---

# Phase 1: Inspect Existing Project

Before coding, inspect the current project structure first.

Check:

- Existing AI Settings component
- Existing Voice Command tab/component
- Existing Voice Response logic
- Existing chatbot response flow
- Existing settings save/load logic
- Existing backend routes
- Existing API structure
- Existing state management pattern

Rules:

- Do not invent new architecture.
- Do not rename existing files unless necessary.
- Do not create new database tables.
- Do not add database table/column SQL in the implementation plan.
- Follow the current project structure.

---

# Phase 2: Add Voice Response Settings UI

Inside the existing **Voice Command** tab, improve the **Voice Response** area.

Add these controls:

## Voice Selector

Add a voice selector/dropdown under **Voice Response**.

## Gender Filter

Options:

- All
- Male
- Female

## Language / Category Filter

Options:

- Auto-detect
- Filipino / Tagalog
- English
- Multilingual

## Voice Controls

Add:

- Speaking rate slider
- Pitch slider
- Volume slider
- Preview Voice button

UI rules:

- Keep the same dark enterprise theme.
- Add clean modern cards or controls.
- Do not remove the existing Voice Preview panel.
- Do not remove the Save Changes button.

Do not remove:

- Enable Voice Command
- Language
- Wake Word
- Listening Sensitivity
- Voice Response
- Voice Preview panel
- Save Changes button

---

# Phase 3: Add Recommended Edge TTS Voices

Use this voice list in frontend or shared config:

```js
const EDGE_TTS_VOICES = [
  {
    id: "fil-PH-BlessicaNeural",
    name: "Blessica",
    locale: "fil-PH",
    language: "Filipino / Tagalog",
    category: "filipino",
    gender: "Female",
    recommended: true
  },
  {
    id: "fil-PH-AngeloNeural",
    name: "Angelo",
    locale: "fil-PH",
    language: "Filipino / Tagalog",
    category: "filipino",
    gender: "Male",
    recommended: true
  },
  {
    id: "en-US-JennyNeural",
    name: "Jenny",
    locale: "en-US",
    language: "English",
    category: "english",
    gender: "Female",
    recommended: true
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy",
    locale: "en-US",
    language: "English",
    category: "english",
    gender: "Male",
    recommended: true
  },
  {
    id: "en-US-EmmaNeural",
    name: "Emma",
    locale: "en-US",
    language: "English",
    category: "english",
    gender: "Female",
    recommended: true
  },
  {
    id: "en-US-EmmaMultilingualNeural",
    name: "Emma Multilingual",
    locale: "en-US",
    language: "Multilingual",
    category: "multilingual",
    gender: "Female",
    recommended: true
  },
  {
    id: "en-US-AvaMultilingualNeural",
    name: "Ava Multilingual",
    locale: "en-US",
    language: "Multilingual",
    category: "multilingual",
    gender: "Female",
    recommended: true
  },
  {
    id: "en-US-AndrewMultilingualNeural",
    name: "Andrew Multilingual",
    locale: "en-US",
    language: "Multilingual",
    category: "multilingual",
    gender: "Male",
    recommended: true
  }
];
```

Default voice rules:

- Use `fil-PH-BlessicaNeural` as default for Filipino / Tagalog.
- Use `en-US-EmmaMultilingualNeural` if language is Auto-detect.
- If the user manually selects a voice, always use the selected voice.

---

# Phase 4: Add Backend TTS Route

Create or update backend route:

```txt
POST /api/tts
```

Install package:

```bash
npm install edge-tts-universal
```

Request body:

```json
{
  "text": "Kamusta! Paano kita matutulungan?",
  "voice": "fil-PH-BlessicaNeural",
  "rate": "0%",
  "pitch": "0Hz",
  "volume": "100%"
}
```

Response:

```txt
Content-Type: audio/mpeg
```

Backend behavior:

- Generate audio using Microsoft Edge TTS.
- Return MP3 audio directly.
- Validate that text is required.
- Validate that voice is required.
- Prevent very long text from being processed.
- Return safe error response if TTS fails.
- Do not expose full server stack trace to frontend.

---

# Phase 5: Add Frontend TTS Playback Flow

When AI response is received:

1. Check if Voice Response is enabled.
2. Call `/api/tts` first.
3. Play returned MP3 audio.
4. If `/api/tts` fails, use browser `speechSynthesis`.

Example flow:

```js
try {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: aiResponseText,
      voice: selectedVoice,
      rate: selectedRate,
      pitch: selectedPitch,
      volume: selectedVolume
    })
  });

  if (!response.ok) throw new Error("TTS request failed");

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  await audio.play();
} catch (error) {
  console.warn("Edge TTS failed, using browser fallback.");
  // fallback to browser speechSynthesis here
}
```

Important:

- Do not break the chatbot if TTS fails.
- User should still hear the AI response through fallback.
- Show warning only in console.

Console warning:

```js
console.warn("Edge TTS failed, using browser fallback.");
```

---

# Phase 6: Add Browser SpeechSynthesis Fallback

Fallback behavior:

If Microsoft Edge TTS fails:

- Automatically fallback to browser built-in `speechSynthesis`.
- Use the same AI response text.
- Use available browser voice closest to selected language if possible.
- Do not show intrusive UI error.
- Do not stop chatbot flow.

Rules:

- Edge TTS is primary.
- Browser built-in TTS is fallback only.
- Fallback must work even if selected Edge voice is unavailable.

---

# Phase 7: Add Voice Preview

When the user clicks **Preview Voice**, use sample text based on selected language/category.

Preview text:

```js
const previewText = {
  filipino: "Kamusta! Ako ang iyong AI assistant.",
  english: "Hello! I am your AI assistant.",
  multilingual: "Hello! Kamusta! I am your AI assistant.",
  auto: "Hello! Kamusta! I am your AI assistant."
};
```

Preview behavior:

1. Use selected voice.
2. Generate preview using Edge TTS first.
3. If Edge TTS fails, fallback to browser `speechSynthesis`.
4. Do not break the UI.

---

# Phase 8: Add Voice Filter Behavior

When category is changed:

- Filter voices based on selected category.
- If category is Filipino / Tagalog and no voice is selected, default to `fil-PH-BlessicaNeural`.
- If category is Auto-detect, default to `en-US-EmmaMultilingualNeural`.
- If gender filter is selected, filter voice list based on gender.
- If no voices match the filter, show:

```txt
No voice available for this filter.
```

---

# Phase 9: Save Settings Using Existing Logic

Save these values using the existing AI settings save logic:

```js
{
  voiceCommandEnabled,
  voiceLanguage,
  wakeWord,
  listeningSensitivity,
  voiceResponseEnabled,
  ttsSettings: {
    engine: "edge",
    fallback: "browser",
    category,
    gender,
    voice,
    rate,
    pitch,
    volume
  }
}
```

Rules:

- Do not create a new save system if one already exists.
- Do not rename current fields unless necessary.
- Use the current architecture and current state management.
- Save selected voice, rate, pitch, volume, gender filter, and language preference if the existing settings system supports it.
- If the current settings system needs adjustment, follow the current project pattern.

---

# Phase 10: Improve Voice Preview Panel

In the Voice Preview panel, show:

- Selected voice name
- Language
- Gender
- Engine status:
  - Edge TTS Active
  - Browser Fallback Ready

Add helper text:

```txt
Edge TTS is used for high-quality AI voice responses. If unavailable, the system automatically uses the browser’s built-in text-to-speech.
```

Keep the same dark enterprise UI style.

---

# Phase 11: Testing Checklist

Test the following:

## UI

- Voice dropdown works.
- Gender filter works.
- Language/category filter works.
- Rate slider works.
- Pitch slider works.
- Volume slider works.
- Preview Voice button works.
- Save Changes still works.
- Existing Voice Command tab UI is not broken.

## Backend

- `/api/tts` returns audio/mpeg.
- Filipino voice works.
- English voice works.
- Multilingual voice works.
- Long text is handled safely.
- Invalid request returns safe error.

## Fallback

- If Edge TTS route fails, browser speechSynthesis works.
- Chatbot response still appears.
- Chatbot response can still be heard.
- No intrusive error appears to user.
- Console shows only:
  `Edge TTS failed, using browser fallback.`

## Chatbot

- AI response still works.
- Voice Response enabled plays audio.
- Voice Response disabled does not play audio.
- Existing chatbot logic is not broken.
- Existing voice command behavior is not broken.

---

# Final Important Rules

- Do not remove existing features.
- Do not rename existing routes/components unless necessary.
- Do not break current voice command, chatbot, or AI settings logic.
- Do not change sidebar/header.
- Do not change the current color theme.
- Do not invent database tables.
- Do not add database table/column SQL in the implementation plan.
- First inspect the existing files/components/routes.
- Implement based on the current architecture only.
