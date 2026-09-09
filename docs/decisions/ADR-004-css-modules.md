# ADR-004: CSS Modules + CSS Variables Approach

**Date:** September 2026  
**Status:** APPROVED (G2 Architecture Gate)  
**Impact:** Frontend styling architecture

---

## Context

VaultGuard currently uses **Tailwind CSS 4** with custom CSS for styling.

Current landing page is production-quality with premium UI/UX:

- Glass-morphism effects
- Dark/light theme support
- Responsive design (mobile, tablet, desktop)
- Smooth animations
- Professional color palette
- Accessible contrast ratios

**Target stack requirement:** "CSS Modules + CSS Variables + standard CSS/media queries. Do not introduce Tailwind CSS."

**Challenge:** Migrate from Tailwind to CSS Modules while preserving visual parity.

**Options:**

1. **CSS Modules + CSS Variables** (recommended)
   - Per-component styling
   - CSS Variables for theming
   - Standard CSS media queries
   - Visual regression testing

2. **Styled Components**
   - CSS-in-JS approach
   - Would require target stack change

3. **CSS-in-JS (Emotion, Linaria)**
   - Runtime overhead
   - Bundle size impact
   - Deviates from target stack

4. **Stay with Tailwind**
   - Violates target stack requirement

---

## Decision

**ADOPT CSS Modules + CSS Variables for styling**

- Each React component gets its own `.module.css` file
- Global CSS variables defined in `src/styles/variables.css`
- Standard CSS for responsive design (@media queries)
- Dark mode via CSS custom properties
- Visual regression testing via Playwright screenshots

---

## Rationale

### Why CSS Modules?

✅ **Component Scoping:** Class names scoped per component (no collisions)  
✅ **Tree Shaking:** Unused styles removed by bundler  
✅ **Performance:** Minimal CSS sent to browser  
✅ **Maintainability:** Styles live with components  
✅ **Type Safety:** CSS Module imports are typed  
✅ **No Runtime Overhead:** Standard CSS (Tailwind has runtime overhead)

### Why CSS Variables?

✅ **Theming:** Change colors globally without rewriting CSS  
✅ **Consistency:** Single source of truth for design tokens  
✅ **Dark Mode:** CSS variables enable theme switching  
✅ **Maintenance:** Update color palette once, applies everywhere  
✅ **Performance:** No JavaScript for theming

### Why NOT Tailwind?

❌ **Target Stack:** "Do not introduce Tailwind CSS"  
❌ **Bundle Size:** Tailwind generates large CSS (even with JIT)  
❌ **Utility Proliferation:** Too many arbitrary values  
❌ **Less Maintainable:** Class names scattered throughout JSX  
❌ **Not Semantic:** Class names don't describe intent

### Migration Strategy: Visual Regression Testing

**Key Innovation:** Automated screenshot comparison prevents regressions

**Process:**

```
1. BASELINE
   └─ Start current Tailwind app
   └─ Take screenshots (5 sizes: mobile, tablet, laptop, desktop, ultra-wide)
   └─ Store as reference

2. MIGRATION (Component by Component)
   ├─ PasswordCard.tsx
   │  ├─ Create PasswordCard.module.css
   │  ├─ Convert Tailwind classes → CSS Module classes
   │  ├─ Take screenshots
   │  ├─ Compare with baseline (pixel-diff)
   │  ├─ Fix regressions until match
   │  └─ Commit
   │
   ├─ PasswordFormModal.tsx
   │  └─ [same process]
   │
   └─ Continue for all 18 components

3. VERIFICATION
   ├─ All screenshots match baseline
   ├─ Responsive behavior verified (5 sizes)
   ├─ Dark/light theme verified
   ├─ Animations preserved
   └─ No accidental UI changes
```

**Tools:**

- Playwright for screenshots
- Sharp/ImageMagick for pixel-diff
- Manual review for animation correctness

---

## Implementation Strategy

### 1. CSS Variables Foundation

```css
/* src/styles/variables.css */

:root {
  /* Colors - Light Mode */
  --color-bg-primary: #f8fafc;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f1f5f9;

  --color-text-primary: #334155;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #cbd5e1;

  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;

  --color-accent: #6366f1; /* Indigo */
  --color-accent-hover: #4f46e5;
  --color-accent-light: #e0e7ff;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Dark Mode */
  --color-bg-primary-dark: #09090b;
  --color-bg-secondary-dark: #0a0a0a;
  --color-bg-tertiary-dark: #18181b;

  --color-text-primary-dark: #a1a1aa;
  --color-text-secondary-dark: #71717a;
  --color-text-tertiary-dark: #52525b;

  --color-border-dark: #3f3f46;
  --color-border-light-dark: #27272a;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Typography */
  --font-family-sans:
    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}

/* Dark Mode Override */
html.dark {
  --color-bg-primary: var(--color-bg-primary-dark);
  --color-bg-secondary: var(--color-bg-secondary-dark);
  --color-text-primary: var(--color-text-primary-dark);
  --color-border: var(--color-border-dark);
}
```

### 2. Component CSS Modules

```css
/* src/components/passwords/PasswordCard.module.css */

.card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
}

.host {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.username {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  word-break: break-all;
}

.strengthBadge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.strengthBadge.strong {
  background-color: var(--color-success);
  color: white;
}

.strengthBadge.weak {
  background-color: var(--color-error);
  color: white;
}

/* Responsive */
@media (max-width: 640px) {
  .card {
    padding: var(--space-md);
  }

  .title {
    font-size: var(--font-size-base);
  }
}
```

### 3. Component Implementation

```tsx
// src/components/passwords/PasswordCard.tsx
import styles from "./PasswordCard.module.css";

interface PasswordCardProps {
  item: PasswordItem;
}

export function PasswordCard({ item }: PasswordCardProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.host}>{item.websiteUrl}</p>
      <p className={styles.username}>{item.username}</p>
      <span
        className={`${styles.strengthBadge} ${styles[item.strengthLevel.toLowerCase()]}`}
      >
        {item.strengthLevel}
      </span>
    </div>
  );
}
```

### 4. Dark Mode Implementation

```tsx
// src/App.tsx
useEffect(() => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}, [theme]);
```

CSS automatically adapts:

```css
html.dark {
  --color-text-primary: var(--color-text-primary-dark);
  --color-bg-secondary: var(--color-bg-secondary-dark);
  /* ... all variables updated ... */
}
```

---

## Visual Regression Testing

### Setup Playwright for Screenshots

```typescript
// tests/visual-regression.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Visual Regression - Light Mode", () => {
  test("PasswordCard matches baseline", async ({ page }) => {
    await page.goto("/passwords");

    const card = page.locator('[data-testid="password-card"]').first();
    await expect(card).toHaveScreenshot("password-card-light.png");
  });

  test("Dashboard matches baseline", async ({ page }) => {
    await page.goto("/dashboard");

    const dashboard = page.locator("main");
    await expect(dashboard).toHaveScreenshot("dashboard-light.png");
  });
});

test.describe("Visual Regression - Dark Mode", () => {
  test.use({ colorScheme: "dark" });

  test("PasswordCard matches baseline - dark", async ({ page }) => {
    await page.goto("/passwords");

    const card = page.locator('[data-testid="password-card"]').first();
    await expect(card).toHaveScreenshot("password-card-dark.png");
  });
});

test.describe("Responsive - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("Dashboard mobile layout", async ({ page }) => {
    await page.goto("/dashboard");

    const dashboard = page.locator("main");
    await expect(dashboard).toHaveScreenshot("dashboard-mobile.png");
  });
});
```

### Pixel Diff Detection

```bash
# Initial run - generate baseline
npx playwright test --update-snapshots

# Subsequent runs - compare
npx playwright test

# If differences found, review and update
npx playwright test --update-snapshots
```

---

## Consequences

### Positive

✅ **No Tailwind Dependency:** Lighter bundle, no utility proliferation  
✅ **Component Colocating:** Styles live with components  
✅ **Type Safe:** CSS Module imports typed  
✅ **Performant:** Standard CSS, no runtime overhead  
✅ **Themeable:** CSS variables enable dark mode easily  
✅ **Maintainable:** Changes to design tokens in one place  
✅ **Visual Regression Caught:** Screenshot testing prevents accidental changes

### Negative/Tradeoffs

⚠️ **Migration Effort:** 18 components × manual CSS writing  
⚠️ **Learning Curve:** CSS Modules + CSS Variables pattern  
⚠️ **More CSS Files:** One per component (vs. Tailwind utility classes)  
⚠️ **Screenshot Maintenance:** Need to update baselines for intentional changes

### Mitigation

- Component-by-component conversion (parallel work possible)
- Strong visual regression testing catches regressions
- CSS variables documentation and examples
- Team training on pattern before implementation

---

## Responsive Design Strategy

### Breakpoints (CSS Media Queries)

```css
/* Mobile-first approach */

/* Extra small (mobile): 0px - 640px */
.card {
  display: block;
  width: 100%;
}

/* Small (tablet): 640px+ */
@media (min-width: 640px) {
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-lg);
  }
}

/* Medium (laptop): 1024px+ */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .sidebar {
    position: sticky;
    top: 0;
  }
}

/* Large (desktop): 1280px+ */
@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Extra large (ultra-wide): 1536px+ */
@media (min-width: 1536px) {
  .container {
    max-width: 1536px;
    margin: 0 auto;
  }
}
```

### Testing Responsive Design

```typescript
test("Dashboard responsive - mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/dashboard");

  const sidebar = page.locator('[data-testid="sidebar"]');
  await expect(sidebar).not.toBeVisible(); // Hidden on mobile

  const hamburger = page.locator('[data-testid="mobile-menu"]');
  await expect(hamburger).toBeVisible();
});

test("Dashboard responsive - tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/dashboard");

  const sidebar = page.locator('[data-testid="sidebar"]');
  await expect(sidebar).toBeVisible();

  const grid = page.locator('[data-testid="password-grid"]');
  // Verify 2-column layout
  const cards = await grid.locator('[data-testid="password-card"]').count();
  expect(cards).toBeGreaterThan(0);
});
```

---

## Migration Timeline

### Phase 3: CSS Modules Migration (Estimated 2-3 weeks)

**Week 1:** Foundations

- [ ] CSS variables defined in variables.css
- [ ] Global styles in global.css
- [ ] Baseline screenshots captured (all 5 sizes, light/dark)

**Week 2:** Component conversion

- [ ] PasswordCard → PasswordCard.module.css
- [ ] PasswordFormModal → PasswordFormModal.module.css
- [ ] All 18 components converted
- [ ] Visual regression tests passing

**Week 3:** Polish & optimization

- [ ] Dark mode tested thoroughly
- [ ] Animations/transitions preserved
- [ ] Performance profiling
- [ ] Final visual QA

### Acceptance Criteria

- [ ] All 18 components using CSS Modules
- [ ] No Tailwind classes remain
- [ ] Visual parity verified (screenshots match baseline)
- [ ] Responsive tested (5 sizes)
- [ ] Dark/light mode working
- [ ] Performance: CSS bundle <50KB
- [ ] No visual regressions

---

## Related Decisions

- **ADR-001:** MongoDB (persistence)
- **ADR-002:** Encryption (security)
- **ADR-003:** Redux + TanStack Query (state)
- **Frontend Architecture:** `docs/architecture/frontend-architecture.md`

---

## References

- CSS Modules: https://github.com/css-modules/css-modules
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- CSS Media Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries
- Playwright Visual Testing: https://playwright.dev/docs/test-snapshots
- Frontend Architecture: `docs/architecture/frontend-architecture.md`
