# Chat Head Implementation Plan

## Objective

Implement a floating Chat Head for the existing AI Chatbot.

This implementation must **not replace, duplicate, or modify the current
chatbot architecture**. The Chat Head should become another interface
for the existing chatbot that already powers the Live Test module.

The AI agent should reuse the existing implementation wherever possible.

------------------------------------------------------------------------

# General Rules

Before implementing any phase:

-   Do not create a new chatbot.
-   Do not duplicate existing AI logic.
-   Do not duplicate prompts.
-   Do not duplicate routing logic.
-   Do not duplicate API endpoints.
-   Do not duplicate conversation logic.
-   Do not duplicate AI settings.
-   Reuse the existing chatbot implementation whenever possible.

The Chat Head should always behave exactly like the current Live Test
chatbot.

------------------------------------------------------------------------

# PLAN 1 --- Administrator Implementation

## Phase 1 --- Global Chat Head Feature

Implement a global Chat Head feature that administrators can enable or
disable.

Requirements:

-   Add a global Chat Head setting.
-   The feature should be disabled everywhere when turned off.
-   This controls the availability of Chat Head across the entire
    platform.

Do not change the existing AI Settings behavior.

## Phase 2 --- Live Test Behavior Synchronization

The Chat Head must always inherit the behavior of the current Live Test
chatbot.

This includes everything already configured inside Live Test.

Any future improvements made to the Live Test chatbot should
automatically apply to the Chat Head without requiring duplicate
implementation.

The Chat Head must never have a separate AI configuration.

## Phase 3 --- Chat Head Preview

Implement an administrator preview.

The preview should allow testing of:

-   Opening the Chat Head
-   Closing the Chat Head
-   Minimizing
-   Restoring
-   Dragging
-   Sending messages

The preview should behave exactly like the Live Test chatbot.

## Phase 4 --- Default Configuration

Allow administrators to configure default Chat Head preferences.

Examples include:

-   Default welcome message
-   Default position
-   Default appearance

These should become the default values for client workspaces unless
overridden.

Do not redesign existing chatbot behavior.

## Phase 5 --- Verification

Verify that Chat Head produces the same responses as Live Test.

Testing should confirm that:

-   Same AI model
-   Same prompts
-   Same AI instructions
-   Same routing
-   Same response formatting
-   Same shortcuts
-   Same live database behavior

------------------------------------------------------------------------

# PLAN 2 --- Client Workspace Implementation

## Phase 1 --- Workspace Enable / Disable

Allow each workspace to enable or disable Chat Head independently.

This option should only be available if the administrator has enabled it
globally.

## Phase 2 --- Workspace Context

Whenever Chat Head is used, ensure that the existing workspace context
is reused.

Do not create another workspace identification system.

## Phase 3 --- Enabled Module Awareness

The chatbot should determine which modules are enabled for the current
workspace.

The AI should only answer using modules that are enabled for that
workspace.

Reuse the existing implementation.

## Phase 4 --- Active Module Awareness

Whenever possible, pass the currently active module to the chatbot.

Use the active module as additional context to improve responses.

## Phase 5 --- Floating Chat Head

Implement:

-   Floating bubble
-   Open
-   Close
-   Minimize
-   Restore

Reuse the existing chatbot interface whenever possible.

## Phase 6 --- Draggable Chat Head

Implement:

-   Mouse dragging
-   Touch dragging
-   Position persistence

Initially, local persistence is acceptable.

## Phase 7 --- Existing Chatbot Integration

Reuse:

-   Existing conversation logic
-   Existing request flow
-   Existing response flow
-   Existing routing
-   Existing AI configuration
-   Existing Live Test behavior

No duplicate implementation should exist.

## Phase 8 --- Workspace Restrictions

Reuse existing permission checks, workspace restrictions, and access
validation.

Do not bypass existing security.

## Phase 9 --- Testing

Verify:

-   Chat Head opens/closes correctly
-   Dragging works
-   Position persists
-   Messages send correctly
-   Responses match Live Test
-   Workspace restrictions are respected
-   Enabled modules are respected
-   Active module context works
-   Existing chatbot features continue working

------------------------------------------------------------------------

# Future Enhancements

Future only:

-   Voice Command
-   Human Handoff
-   Chat history
-   Workspace branding
-   Notification center
-   Suggested prompts
-   Theme customization
-   Multi-device synchronization
