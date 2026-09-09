# Frontend Architecture (Target)

**Date:** September 2026  
**Gate:** G2 - Architecture Review  
**Focus:** React Router, Redux Toolkit, TanStack Query, CSS Modules

---

## 1. Frontend Technology Stack

### 1.1 Core Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^6.20+",
    "redux": "^4.2+",
    "@reduxjs/toolkit": "^1.9+",
    "react-redux": "^8.1+",
    "@tanstack/react-query": "^5.25+",
    "typescript": "^5.8+",
    "vite": "^6.2+",
    "lucide-react": "^0.546+",
    "motion": "^12.23+"
  }
}
```

### 1.2 Why These Choices

| Technology         | Why                           | Alternative     | Why Not                   |
| ------------------ | ----------------------------- | --------------- | ------------------------- |
| React Router       | Type-safe routing, URL sync   | Tanstack Router | Overkill for Phase 1      |
| Redux Toolkit      | Simple, well-tested, DevTools | Zustand         | Lost ecosystem benefits   |
| TanStack Query     | Automatic cache management    | SWR             | Better pagination support |
| CSS Modules        | Component scoping, type-safe  | CSS-in-JS       | Keep CSS as CSS           |
| Tailwind (convert) | Current foundation            | Emotion/Styled  | Maintain visual parity    |

---

## 2. Folder Structure

### 2.1 Proposed Frontend Organization

```
src/
├── app/                              # Application root
│   ├── App.tsx                       # Root component + Router
│   ├── store.ts                      # Redux store setup
│   └── hooks.ts                      # Custom typed hooks
│
├── features/                         # Feature modules (vertical slicing)
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── services/
│   │   │   └── authApi.ts            # TanStack Query hooks
│   │   ├── store/
│   │   │   ├── authSlice.ts          # Redux slice
│   │   │   └── sessionSlice.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── tokenUtils.ts
│   │       └── sessionUtils.ts
│   │
│   ├── vault/
│   │   ├── components/
│   │   │   ├── VaultList.tsx
│   │   │   ├── VaultCard.tsx
│   │   │   ├── VaultForm.tsx
│   │   │   └── VaultHeader.tsx
│   │   ├── pages/
│   │   │   ├── VaultPage.tsx
│   │   │   └── VaultDetailPage.tsx
│   │   ├── services/
│   │   │   └── vaultApi.ts
│   │   ├── store/
│   │   │   └── vaultSlice.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── vaultUtils.ts
│   │       └── encryptionUtils.ts
│   │
│   ├── passwords/
│   │   ├── components/
│   │   │   ├── PasswordList.tsx
│   │   │   ├── PasswordCard.tsx
│   │   │   ├── PasswordForm.tsx
│   │   │   ├── PasswordGenerator.tsx
│   │   │   ├── PasswordStrengthChecker.tsx
│   │   │   ├── PasswordDetailModal.tsx
│   │   │   └── PasswordFilters.tsx
│   │   ├── pages/
│   │   │   └── PasswordsPage.tsx
│   │   ├── services/
│   │   │   └── passwordApi.ts
│   │   ├── store/
│   │   │   └── passwordSlice.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── passwordUtils.ts
│   │       └── strengthAnalyzer.ts
│   │
│   ├── categories/
│   │   ├── components/
│   │   │   ├── CategoryList.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── CategorySelect.tsx
│   │   ├── services/
│   │   │   └── categoryApi.ts
│   │   ├── store/
│   │   │   └── categorySlice.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── activity/
│   │   ├── components/
│   │   │   ├── ActivityTimeline.tsx
│   │   │   ├── ActivityCard.tsx
│   │   │   └── ActivityFilters.tsx
│   │   ├── pages/
│   │   │   └── ActivityPage.tsx
│   │   ├── services/
│   │   │   └── activityApi.ts
│   │   ├── store/
│   │   │   └── activitySlice.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   ├── SettingsForm.tsx
│   │   │   ├── PreferencesSection.tsx
│   │   │   ├── SecuritySection.tsx
│   │   │   └── ExportImportSection.tsx
│   │   ├── pages/
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   └── settingsApi.ts
│   │   ├── store/
│   │   │   └── settingsSlice.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   └── dashboard/
│       ├── components/
│       │   ├── DashboardOverview.tsx
│       │   ├── StatCard.tsx
│       │   ├── RecentActivity.tsx
│       │   └── SecurityStatus.tsx
│       ├── pages/
│       │   └── DashboardPage.tsx
│       ├── services/
│       │   └── dashboardApi.ts
│       ├── store/
│       │   └── dashboardSlice.ts
│       └── types/
│           └── index.ts
│
├── shared/                           # Shared across features
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── UI/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       ├── useModal.ts
│   │       ├── useToast.ts
│   │       ├── useFetch.ts
│   │       └── useFormState.ts
│   ├── services/
│   │   ├── api.ts                    # Fetch wrapper + interceptors
│   │   ├── crypto.ts                 # Crypto utilities
│   │   └── storage.ts                # localStorage wrapper
│   ├── store/
│   │   ├── uiSlice.ts                # UI state (theme, modals, toasts)
│   │   └── index.ts                  # Store configuration
│   ├── types/
│   │   ├── api.ts                    # API request/response types
│   │   ├── domain.ts                 # Business domain types
│   │   └── ui.ts                     # UI state types
│   ├── utils/
│   │   ├── cn.ts                     # Classname utility
│   │   ├── formatters.ts             # Date, number formatting
│   │   ├── validators.ts             # Input validation
│   │   └── constants.ts              # App constants
│   └── styles/
│       ├── globals.css
│       ├── variables.css              # CSS variables (theme tokens)
│       ├── reset.css
│       └── animations.css
│
├── pages/
│   ├── NotFoundPage.tsx              # 404
│   ├── LandingPage.tsx               # Public landing (if used)
│   └── ErrorPage.tsx                 # Error fallback
│
├── App.tsx                           # Root component
├── main.tsx                          # Entry point
├── index.css                         # Global styles
└── types.ts                          # Global types
```

---

## 3. State Management Architecture

### 3.1 Redux Toolkit Store Structure

```typescript
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import authReducer from "../features/auth/store/authSlice";
import sessionReducer from "../features/auth/store/sessionSlice";
import passwordReducer from "../features/passwords/store/passwordSlice";
import categoryReducer from "../features/categories/store/categorySlice";
import activityReducer from "../features/activity/store/activitySlice";
import settingsReducer from "../features/settings/store/settingsSlice";
import uiReducer from "../shared/store/uiSlice";

export const store = configureStore({
  reducer: {
    // Auth domain
    auth: authReducer,
    session: sessionReducer,

    // Data domains
    passwords: passwordReducer,
    categories: categoryReducer,
    activity: activityReducer,
    settings: settingsReducer,

    // UI state
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/setToken"], // handle non-serializable tokens if needed
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 3.2 Redux Slices Organization

```
AUTH DOMAIN:
├── authSlice.ts
│   ├── user: User | null
│   ├── isAuthenticated: boolean
│   ├── loginError: string | null
│   ├── loginLoading: boolean
│   └── actions: login, logout, register, setUser
│
└── sessionSlice.ts
    ├── accessToken: string | null
    ├── refreshToken: string | null
    ├── expiresAt: number
    ├── isSessionValid: boolean
    └── actions: setTokens, clearSession, validateSession

PASSWORDS DOMAIN:
└── passwordSlice.ts
    ├── selectedPasswordId: string | null
    ├── filters: { category, strength, search }
    ├── sortBy: 'name' | 'date' | 'strength'
    ├── view: 'grid' | 'table'
    └── actions: setFilters, selectPassword, setSortBy

CATEGORIES DOMAIN:
└── categorySlice.ts
    ├── selectedCategoryId: string | null
    └── actions: selectCategory

ACTIVITY DOMAIN:
└── activitySlice.ts
    ├── dateRange: { from, to }
    ├── filters: { type, severity }
    └── actions: setDateRange, setFilters

SETTINGS DOMAIN:
└── settingsSlice.ts
    ├── preferences: { theme, language, autoLock }
    └── actions: updatePreferences

UI DOMAIN:
└── uiSlice.ts
    ├── theme: 'light' | 'dark'
    ├── modals: { searchOpen, formOpen, detailOpen, importOpen, exportOpen }
    ├── notifications: Toast[]
    ├── loading: boolean
    └── actions: openModal, closeModal, addNotification, setLoading
```

### 3.3 Redux Slice Example

```typescript
// src/features/auth/store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks will be in services (next section)

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle async thunk results
  },
});

export const { logout, setError } = authSlice.actions;
export default authSlice.reducer;
```

---

## 4. TanStack Query Integration

### 4.1 Query Hooks Organization

```typescript
// src/features/passwords/services/passwordApi.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// QUERIES
export function usePasswords(vaultId: string) {
  return useQuery({
    queryKey: ["passwords", vaultId],
    queryFn: () => api.get(`/api/v1/passwords?vaultId=${vaultId}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function usePassword(passwordId: string) {
  return useQuery({
    queryKey: ["password", passwordId],
    queryFn: () => api.get(`/api/v1/passwords/${passwordId}`),
    enabled: !!passwordId,
  });
}

// MUTATIONS
export function useCreatePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePasswordInput) =>
      api.post("/api/v1/passwords", data),
    onSuccess: (newPassword) => {
      // Invalidate passwords list
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      // Optionally add to cache
      queryClient.setQueryData(["password", newPassword.id], newPassword);
    },
  });
}

export function useUpdatePassword(passwordId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePasswordInput) =>
      api.put(`/api/v1/passwords/${passwordId}`, data),
    onSuccess: (updatedPassword) => {
      queryClient.setQueryData(["password", passwordId], updatedPassword);
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
  });
}
```

### 4.2 Query Key Factory Pattern

```typescript
// src/shared/services/queryKeys.ts
export const queryKeys = {
  all: () => ["api"] as const,

  passwords: () => [...queryKeys.all(), "passwords"] as const,
  passwordsList: (vaultId: string) =>
    [...queryKeys.passwords(), "list", vaultId] as const,
  passwordDetail: (id: string) =>
    [...queryKeys.passwords(), "detail", id] as const,

  categories: () => [...queryKeys.all(), "categories"] as const,
  categoriesList: () => [...queryKeys.categories(), "list"] as const,

  activities: () => [...queryKeys.all(), "activities"] as const,
  activitiesList: (filters: object) =>
    [...queryKeys.activities(), "list", filters] as const,
};
```

---

## 5. React Router Configuration

### 5.1 Route Structure

```typescript
// src/app/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/vaults">
            <Route index element={<VaultsPage />} />
            <Route path=":vaultId" element={<VaultDetailPage />} />
          </Route>

          <Route path="/passwords">
            <Route index element={<PasswordsPage />} />
            <Route path=":passwordId" element={<PasswordDetailPage />} />
          </Route>

          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 5.2 Route Protection

```typescript
// src/shared/components/ProtectedLayout.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <MainLayout>
      <Outlet /> {/* Child route components render here */}
    </MainLayout>
  );
}
```

---

## 6. Styling Architecture (CSS Modules)

### 6.1 CSS Modules Pattern

```typescript
// src/features/passwords/components/PasswordCard.tsx
import styles from './PasswordCard.module.css';

export function PasswordCard({ password }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{password.host}</h3>
        <span className={`${styles.badge} ${styles[`badge-${password.strength}`]}`}>
          {password.strength}
        </span>
      </div>
      <p className={styles.username}>{password.username}</p>
      <div className={styles.actions}>
        <button className={styles.button}>Copy</button>
      </div>
    </div>
  );
}
```

### 6.2 CSS Modules Structure

```css
/* src/features/passwords/components/PasswordCard.module.css */

.card {
  background: var(--color-card-bg);
  border: var(--border-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.title {
  font-size: var(--font-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: var(--font-semibold);
}

.badge-weak {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}

.badge-good {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.badge-strong {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.username {
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
  margin: 0 0 var(--spacing-sm) 0;
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
}

.button {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-sm);
  transition: background var(--transition-base);
}

.button:hover {
  background: var(--color-button-bg-hover);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .card {
    background: var(--color-card-bg-dark);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .card {
    padding: var(--spacing-sm);
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

### 6.3 CSS Variables (Design Tokens)

```css
/* src/shared/styles/variables.css */

:root {
  /* Colors */
  --color-primary: #4f46e5;
  --color-primary-dark: #4338ca;

  --color-card-bg: #ffffff;
  --color-card-bg-dark: #1f2937;

  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;

  --color-danger-bg: #fee2e2;
  --color-danger-text: #991b1b;

  --color-warning-bg: #fef3c7;
  --color-warning-text: #92400e;

  --color-success-bg: #dcfce7;
  --color-success-text: #166534;

  /* Spacing */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  --spacing-md: 1rem; /* 16px */
  --spacing-lg: 1.5rem; /* 24px */
  --spacing-xl: 2rem; /* 32px */

  /* Typography */
  --font-xs: 0.75rem; /* 12px */
  --font-sm: 0.875rem; /* 14px */
  --font-base: 1rem; /* 16px */
  --font-lg: 1.125rem; /* 18px */
  --font-bold: 700;
  --font-semibold: 600;

  /* Borders */
  --radius-sm: 0.375rem; /* 6px */
  --radius-md: 0.5rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */

  --border-card: 1px solid #e5e7eb;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #f3f4f6;
    --color-text-secondary: #d1d5db;
  }
}
```

---

## 7. Custom Hooks

### 7.1 useAuth Hook

```typescript
// src/shared/hooks/useAuth.ts
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../app/store";
import { logout } from "../../features/auth/store/authSlice";

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const session = useSelector((state: RootState) => state.session);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    token: session.accessToken,
    logout: () => dispatch(logout()),
  };
}
```

### 7.2 useModal Hook

```typescript
// src/shared/hooks/useModal.ts
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../app/store";
import { openModal, closeModal } from "../../shared/store/uiSlice";

export function useModal(modalName: string) {
  const dispatch = useDispatch();
  const isOpen = useSelector(
    (state: RootState) => state.ui.modals[modalName] || false,
  );

  return {
    isOpen,
    open: () => dispatch(openModal(modalName)),
    close: () => dispatch(closeModal(modalName)),
    toggle: () =>
      dispatch(isOpen ? closeModal(modalName) : openModal(modalName)),
  };
}
```

---

## 8. Error Handling & Error Boundaries

### 8.1 Error Boundary Component

```typescript
// src/shared/components/ErrorBoundary.tsx
import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error boundary caught:', error, info);
    // Send to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 8.2 Query Error Handling

```typescript
// In components using TanStack Query
function PasswordsList() {
  const { data, isLoading, error } = usePasswords(vaultId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;
  if (!data?.length) return <EmptyState />;

  return <div>{/* render passwords */}</div>;
}
```

---

## 9. Performance Optimizations

### 9.1 Code Splitting

```typescript
// src/app/App.tsx
import { Suspense, lazy } from 'react';

const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const PasswordsPage = lazy(() => import('../features/passwords/pages/PasswordsPage'));
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage'));

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/passwords" element={<PasswordsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 9.2 Memo & useCallback

```typescript
// Prevent unnecessary re-renders
const PasswordCard = memo(function PasswordCard({ password, onSelect }: Props) {
  const handleClick = useCallback(() => {
    onSelect(password.id);
  }, [password.id, onSelect]);

  return <div onClick={handleClick}>{/* ... */}</div>;
});
```

---

## 10. Browser Storage Strategy

### 10.1 What to Store Where

| Data                | Storage                   | Reason                        |
| ------------------- | ------------------------- | ----------------------------- |
| Access token        | HttpOnly cookie (Phase 3) | XSS protection                |
| Refresh token       | HttpOnly cookie (Phase 3) | XSS protection                |
| Vault key           | Memory only (Redux)       | Never persist encryption keys |
| Plaintext passwords | Memory only (Redux)       | Cleared on logout/page close  |
| User preferences    | localStorage              | Survives page reload          |
| Theme setting       | localStorage              | User preference               |
| Redux state         | Redux store + DevTools    | Runtime only                  |

### 10.2 Token Management Flow

```typescript
// Phase 1: Current (localStorage - XSS risk)
localStorage.setItem("vaultguard_token", accessToken);
localStorage.setItem("vaultguard_refresh_token", refreshToken);

// Phase 3: Recommended (HttpOnly cookies)
// Server sets: Set-Cookie: vaultguard_token=...; HttpOnly; Secure; SameSite=Strict
// Server sets: Set-Cookie: vaultguard_refresh_token=...; HttpOnly; Secure; SameSite=Strict
// Browser automatically sends cookies with each request
// JavaScript cannot access cookies (immune to XSS for token theft)
```

---

## 11. Accessibility (A11y)

- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Form label associations
- Skip links
- Focus indicators
- Screen reader testing

---

## 12. TypeScript Configuration

```typescript
// tsconfig.json (frontend specific)
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@features/*": ["./features/*"],
      "@shared/*": ["./shared/*"],
    }
  }
}
```

---

## 13. Visual Regression Strategy (CSS Migration)

### Phase 1: Capture Baseline

- Run current app (Tailwind)
- Take Playwright screenshots of all pages/states
- Store as golden master images

### Phase 2: Convert Component by Component

- Convert PasswordCard Tailwind → CSS Modules
- Run Playwright screenshots
- Compare pixel-by-pixel against baseline
- Fix visual regressions
- Move to next component

### Phase 3: Responsive Testing

- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)
- Small mobile (320x568)

### Phase 4: Interactive States

- Hover states
- Focus states
- Active states
- Disabled states
- Loading states
- Error states

### Phase 5: Theme Testing

- Light mode
- Dark mode
- Theme toggle
- System preference detection

---

## 14. Development Workflow

### 14.1 Running Frontend

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:watch

# E2E tests
npm run test:e2e
```

### 14.2 Hot Module Replacement (HMR)

Vite provides HMR out of the box for:

- Component hot reload
- CSS hot reload
- No full page refresh needed
- State preserved across updates

---

## Next Steps (Architecture Review)

1. ✅ Frontend architecture designed
2. ⏳ Backend architecture to follow
3. ⏳ Database architecture to follow
4. ⏳ Authentication/security architecture to follow
