# CLAUDE.md — Expense Tracker Project Context

## What this project is

A personal expense tracker built with Angular v21.
Built across 9 weeks as a learning journey — each week introduced
one Angular concept. The codebase reflects deliberate, documented
architectural decisions — not shortcuts.

This is a portfolio project being extended with new features
in a YouTube series called "Angular with Claude Code."

---

## Tech stack

- **Framework**: Angular v21 standalone components
- **State**: NgRx Signal Store (@ngrx/signals)
- **Routing**: Lazy loaded with loadComponent
- **HTTP**: Angular HttpClient with functional interceptors
- **Persistence**: localStorage first, json-server API second
- **Auth**: AuthService with JWT stored in localStorage
- **Styling**: Inline styles currently — no CSS framework

## Architecture rules — follow these always

### State management

- ALL application state lives in `ExpenseStore`
- Components NEVER mutate state directly
- State changes ONLY through `patchState()` inside `withMethods()`
- Components inject `ExpenseStore` and call its methods
- Local UI-only state (loading a single button etc) can use `signal()` in the component

### Components

- ALL components are standalone — no NgModules ever
- Use `inject()` not constructor injection
- File naming: `feature-name.ts` NOT `feature-name.component.ts`
- Templates: `feature-name.html` NOT `feature-name.component.html`
- Always use `@for`, `@if`, `@else`, `@empty` — never `*ngFor`, `*ngIf`

### Forms

- Use Reactive Forms (`FormGroup`, `FormControl`, `Validators`)
- Never use template-driven forms (`ngModel` for forms)
- Always add validation — `Validators.required` minimum
- Always add error messages below each field

### Routing

- All routes use `loadComponent` — always lazy loaded
- Guards use `CanActivateFn` — functional not class-based
- Resolvers use `ResolveFn<T>` — functional not class-based

### Signals

- Use `input()` and `output()` signals not `@Input()` `@Output()` decorators
- Use `model()` for two-way binding in child components
- `effect()` for side effects only — not for derived values
- `computed()` for derived values — not `effect()`

### HTTP

- All HTTP calls go through `HttpClient`
- Always use `catchError()` — never let Observables error silently
- Interceptors handle loading and error state globally
- Never set `isLoading` manually in components

### Pipes

- Display formatting always goes in a pipe — never in the template
- All pipes are standalone and pure
- Import pipes directly into component imports array

---

## Naming conventions

Files: kebab-case → expense-store.ts
Classes: PascalCase → ExpenseStore
Methods: camelCase → addExpense()
Signals: camelCase → filteredExpenses
Constants: SCREAMING_SNAKE → SEED_EXPENSES
CSS classes: kebab-case → active-link

## What NOT to do — ever

Never Use NgModules — this is a standalone Angular app
Never Use @Input() / @Output() decorators — use input() / output() signals
Never Use *ngFor / *ngIf — use @for / @if control flow
Never Use constructor injection — use inject()
Never Use Direct signal mutation from components — use store methods
Never Use subscribe() without catchError()
Never Use Impure pipes
Never Use Any file with .component. in the name

---

## Current categories

Food, Transport, Shopping, Bills, Health, Entertainment, Other

## Currency

Pakistani Rupees — always display as "Rs X,XXX"
Use PkrCurrencyPipe for all currency display

## Demo credentials

username: admin
password: password

---

## How to run the project

```bash
# Terminal 1 — Angular app
ng serve

# Terminal 2 — json-server API
npm run api

# Build for GitHub Pages
git checkout main
ng build --base-href /expense-tracker/ --output-path docs
cp -r docs/browser/* docs/
rm -r docs/browser
git add . && git commit -m "..." && git push origin main

---

## Branch Naming

Branch naming: `feature/feature-name`

---

## For Claude Code specifically

When I ask you to build a feature:

1. Read the relevant existing files first
2. Follow ALL conventions above without exception
3. Never suggest NgModules, class-based guards, or @Input/@Output
4. When generating a new component check the features/ folder for examples
5. When modifying the store follow the withMethods() pattern exactly
6. Always generate the .ts file AND the .html file for new components
7. Add the new route to app.routes.ts using loadComponent
8. Tell me which files you created or modified

```

## Angular MCP Server

This project uses the Angular CLI MCP server.
Stable as of Angular v21 (launched in v20.2).

Configuration: see project MCP config
command: npx
args: ["-y", "@angular/cli", "mcp"]
(VS Code uses "servers"; Claude Code uses "mcpServers")

### What it provides (documentation & guidance — NOT compilation)

- search_documentation : live angular.dev docs
- get_best_practices : current Angular standards guide
- find_examples : official modern code examples
- list_projects : reads angular.json project names
- onpush_zoneless_migration : OnPush migration planning
- ai_tutor : interactive Angular teaching

### What it does NOT do

- No type checking (that is npx tsc / ng build directly)
- No template validation
- No deep analysis of our models, signals, or interfaces

### How to use it

Before generating Angular code, consult get_best_practices
so suggestions follow current v21 standards — especially:
input()/output() signals, standalone components,
@for/@if control flow, typed reactive forms.
When unsure about an API, use search_documentation
against angular.dev rather than relying on training data.
