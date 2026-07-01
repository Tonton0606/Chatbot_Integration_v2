# AI Voice Command Chatbot Integration Plan

## Purpose

Add AI voice command support to the existing working ExponifyPH AI Chatbot without rebuilding or changing the current chatbot logic.

The current chatbot already works through text input. The goal is to add voice as another input method:

```txt
User speaks
→ Speech is converted to text
→ Existing chatbot receives the text
→ Existing chatbot answers normally
→ Optional voice response reads the answer aloud
```

---

## Important Instruction for the AI Agent

Do not rebuild the chatbot.

Do not remove or replace the existing chat logic, AI response logic, routing logic, shortcut buttons, model selection, user role selection, response insights, or current UI behavior.

Only add voice command features on top of the existing working chatbot.

Use the existing chatbot send message function whenever possible.

---

## Phase 1: Add Basic Voice Input

### Goal

Allow the user to click a microphone button and speak a question.

### Process

```txt
User clicks microphone button
→ Browser requests microphone permission
→ Browser listens to speech
→ Speech is converted into text
→ Text is placed into the chat input
→ Existing send message function sends it to the chatbot
→ Chatbot replies normally
```

### Requirements

- Add microphone button beside the chat input or send button.
- Use browser speech recognition first.
- Do not change the existing chatbot API.
- Do not create a new chatbot flow.
- Voice transcript should use the same function as typed messages.

### Expected Behavior

Example:

```txt
User says:
"What is my undone task?"

System converts it to:
what is my undone task?

Then sends it to the current chatbot.
```

---

## Phase 2: Add Voice Command Settings UI

### Goal

Add a simple Voice Command tab inside AI Settings.

Use the existing AI Settings layout with left-side inner tabs:

```txt
General
Voice Command
```

### Voice Command UI Fields

Keep it simple and aesthetic.

Required fields only:

```txt
Enable Voice Command: ON/OFF
Language: Auto-detect / English / Tagalog
Wake Word: Hey Exponify
Listening Sensitivity: Low / Medium / High
Voice Response: ON/OFF
Test Microphone Button
```

### Do Not Add

Do not add allowed voice actions for now.

Do not add create/update/delete options.

Do not add complex permissions yet.

---

## Phase 3: Connect Voice Settings to State

### Goal

Make the Voice Command tab functional in frontend state first.

### Requirements

Create or extend frontend state for:

```js
voiceCommandEnabled
voiceLanguage
wakeWord
voiceSensitivity
voiceResponseEnabled
isListening
voiceTranscript
```

### Behavior

- If voice command is disabled, microphone button should be disabled or hidden.
- If enabled, microphone button should start listening.
- If browser does not support speech recognition, show a friendly message.
- Voice settings should not break the current chat behavior.

---

## Phase 4: Speech-to-Text Integration

### Goal

Convert speech into text using browser Web Speech API.

### Recommended First Implementation

Use:

```js
window.SpeechRecognition || window.webkitSpeechRecognition
```

### Flow

```txt
startVoiceListening()
→ initialize SpeechRecognition
→ set language
→ start listening
→ receive transcript
→ send transcript to existing chatbot
```

### Important

The voice transcript must call the same function used by normal chat messages.

Example concept:

```js
const transcript = event.results[0][0].transcript;
setInput(transcript);
sendMessage(transcript);
```

If the current chatbot uses another function name, use that existing function instead.

---

## Phase 5: Text-to-Speech Response

### Goal

Allow the AI response to be read aloud when Voice Response is enabled.

### Process

```txt
Chatbot receives response
→ Check voiceResponseEnabled
→ If enabled, use browser SpeechSynthesis
→ Read the AI response aloud
```

### Recommended First Implementation

Use:

```js
window.speechSynthesis
```

### Rule

Only read the final assistant response.

Do not read system logs, loading text, error stack traces, or hidden route JSON.

---

## Phase 6: Wake Word Support

### Goal

Support a simple wake word such as:

```txt
Hey Exponify
```

### Simple First Version

The user can say:

```txt
Hey Exponify, what is my undone task?
```

The system should remove the wake word and send only:

```txt
what is my undone task?
```

### Process

```txt
Speech transcript received
→ Check if transcript includes wake word
→ Remove wake word
→ Send remaining message to chatbot
```

### Important

Do not create always-on listening yet if it is too risky or unstable.

For first version, wake word can work after clicking the microphone button.

---

## Phase 7: Save Voice Settings

### Goal

Persist voice command settings so they remain after reload.

### Instruction for AI Agent

Use the existing settings table or settings saving pattern already used in the system.

Do not invent table names if the system already has an AI settings table.

If the current project already has an `ai_chatbot_settings` table or similar, extend that existing table.

If no suitable table exists, propose the needed database change before implementing.

### Suggested Fields

```txt
voice_command_enabled
voice_language
wake_word
voice_response_enabled
voice_sensitivity
```

### Important

The AI agent should inspect the current database/schema and existing settings logic before adding fields.

---

## Phase 8: Safety Rules

### Current Scope

For now, voice command should only behave like normal chat input.

Allowed:

```txt
Ask questions
Search using existing chatbot
Route using existing chatbot
Navigate only if existing chatbot already supports navigation shortcuts
```

Not allowed for now:

```txt
Create records
Update records
Delete records
Send emails
Send messages
Change permissions
Run SQL directly
```

### Confirmation Rule for Future

If future voice commands can update or delete data, require confirmation first.

Example:

```txt
You said: "Delete this task."
Please confirm before I continue.
```

---

## Phase 9: Error Handling

### Required Error States

Handle these cases:

```txt
Browser does not support speech recognition
Microphone permission denied
No speech detected
Speech recognition failed
Voice command disabled
Empty transcript
Network/API error after transcript is sent
```

### User-Friendly Messages

Examples:

```txt
Voice recognition is not supported in this browser.
Please allow microphone access to use voice command.
I did not hear anything. Please try again.
Voice command is currently disabled in settings.
```

---

## Phase 10: Testing Checklist

### Basic Tests

```txt
Enable voice command
Disable voice command
Click microphone
Speak English question
Speak Tagalog question
Speak Taglish question
Check if transcript appears
Check if transcript sends to chatbot
Check if chatbot responds correctly
Check if response can be read aloud
Check if reset conversation still works
Check if model selection still works
Check if user role selection still works
```

### Example Test Prompts

```txt
What is my undone task?
Go to tasks
Show my latest contacts
What is the latest task in operations?
Summarize my active rules
What modules are available?
```

---

## Phase 11: Recommended First Release

For the first version, build only this:

```txt
Voice Command tab
Enable/disable toggle
Mic button
Speech-to-text
Send transcript to existing chatbot
Optional read aloud response
Simple wake word after mic click
```

Do not add advanced command permissions yet.

Do not add create/update/delete voice actions yet.

Do not change the chatbot backend logic unless needed.

---

## Phase 12: Future Upgrade Options

After the browser version works, the system can be upgraded.

### Better Speech-to-Text

Possible future options:

```txt
Groq Whisper
Deepgram
OpenAI Whisper
```

### Better Text-to-Speech

Possible future options:

```txt
ElevenLabs
OpenAI TTS
Azure Speech
Google Cloud Text-to-Speech
```

### Future Enterprise Features

```txt
Continuous listening
Voice activity detection
Speaker confirmation
Voice audit logs
Per-role voice permissions
Voice command history
Voice command analytics
Multilingual voice routing
```

---

## Final Implementation Principle

The voice command feature should be an enhancement, not a replacement.

The existing chatbot should continue working exactly as it works now.

The correct architecture is:

```txt
Voice Input
→ Speech-to-text
→ Existing chatbot input
→ Existing AI/chatbot response
→ Optional text-to-speech
```

Do not duplicate the chatbot logic.

Do not create a separate AI system.

Do not remove existing features.

Only add voice as another way to send messages.
