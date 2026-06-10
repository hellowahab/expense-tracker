## Addition of Voice Feature

### Warm up prompt for claude Code

"We're adding a new feature creating expenses by voice.
Read CLAUDE.md and confirm our conventions.
Then read
src/app/features/add-expense/add-expense.ts
and src/app/store/expense.store.ts
so you understand how expenses are currently created."

### Prompt 1 Create a Voice Capture Service using Browser Web Speech API

Create a VoiceCaptureService that wraps the browser's Web Speech API. I want it to expose everything as signals ollowing our app's patterns whether it's listening, the live transcript as someone speaks, the final transcript, any error, and whether the browser even supports it.

Handle the common failure cases
denied microphone, no speech detected, unsupported browser
with user-friendly error messages, not raw API errors.

Web Speech only needs to capture one short phrase at a time, not continuous dictation.
Propose the service before writing it."

### Prompt 2 Add a button to the Expense Page

"Read add-expense.ts and add-expense.html.

Add a microphone button to the Add Expense page that uses the VoiceCaptureService. While listening, show the live transcript as the user speaks and animate the button so it's obvious the mic is active.

If the browser doesn't support voice, hide the button entirely the manual form still works.

Follow our existing styling patterns in the template."

### Prompt 3 Parse the spoken phrase

"Now I need to turn a spoken phrase like 'spent four hundred on yougurt today'into structured expense fields amount, category, title, and date.

Write a parser in plain TypeScript. It needs to:
pull out the amount, handling both digits ('400') and spoken numbers ('four hundred')
match a category from our existing list (Food, Transport, Shopping, Bills, Health, Entertainment, Other)
using sensible keywords
'yougurt' and 'lunch' map to Food,
'fuel' and 'uber' to Transport, and so on
detect 'today' / 'yesterday' for the date
use the leftover text as the title

Show me your approach to the spoken-number problem first that's the tricky part."

### Prompt 4 Show a confirmation card before saving

"When the parse finishes, don't save automatically. Show a confirmation card with the parsed fields filled in, so the user can see what was understood before saving.

If it looks right, they confirm and it saves through the store. We need a createExpenseFromVoice method on
ExpenseStore that validates the parsed data and adds the expense follow the existing withMethods pattern in expense.store.ts.

If the parse missed something, the user can still fall back to the normal form."

### Prompt 5 Improvise categorization for expense

The categorization of expense isn't working correctly.
I have provided Yougurt and it put in the other category instead of food
I have asked for a belt and it again tagged it with other category instead of Clothing.

Make it robust in terms of identifying the right categorization for the expense

### Prompt 6 Get Feedback from Claude

"What did you have to be corrected on this session?

What should we add to CLAUDE.md so the voice feature's patterns are documented for future sessions?"
