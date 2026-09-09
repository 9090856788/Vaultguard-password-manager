# ADR-003: Redux Toolkit + TanStack Query Separation

**Date:** September 2026  
**Status:** APPROVED (G2 Architecture Gate)  
**Impact:** Frontend state management architecture

---

## Context

VaultGuard frontend needs to manage:

1. **Application State** (client-only, persistent)
   - Authentication (user, tokens)
   - UI state (activeTab, theme, selected filters)
   - Modal state (which modals are open)
   - User preferences (auto-logout minutes, clipboard clear time)

2. **Server State** (fetched from API, cached)
   - Password list
   - Categories
   - Activity logs
   - Security stats

Current implementation uses **React Context** for everything, with manual fetch/cache management.

**Options:**

1. **Redux Toolkit (app state) + TanStack Query (server state)** (recommended)
2. Context API for everything
3. Zustand for everything
4. Apollo Client (GraphQL-focused, overkill)
5. MobX (less community support in React)

---

## Decision

**ADOPT Redux Toolkit for application state + TanStack Query for server state**

### Redux Toolkit (Application State)

Manages:

- User authentication (user profile, tokens)
- UI navigation (active tab, selected category)
- Theme (dark/light)
- Modals (open/closed state)
- Filters (search query, strength filter)

### TanStack Query (Server State)

Manages:

- Password list caching
- Category list caching
- Activity log caching
- Automatic refetching
- Background refetching
- Stale-while-revalidate
- Retry logic
- Error handling

---

## Rationale

### Redux Toolkit Benefits

✅ **Application State:**

- Single source of truth for app state
- DevTools time-travel debugging
- Predictable state transitions
- Middleware support (logging, analytics)
- Mature ecosystem (10+ years)
- Type safety with Redux Toolkit
- Better performance than Context (selective re-renders)

✅ **Why Redux Toolkit (not plain Redux):**

- Less boilerplate (createSlice)
- Immer for immutable updates
- Built-in async thunk support
- Modern approach to Redux

### TanStack Query Benefits

✅ **Server State:**

- Automatic caching (background refetches)
- Deduplication (single request for multiple consumers)
- Stale-while-revalidate pattern
- Error boundaries per query
- Retry logic built-in
- Background refetching
- Pagination/infinite scroll built-in
- DevTools for debugging queries
- No Redux boilerplate for API calls

### Why Separate?

**Redux for everything = complexity:**

- API call logic mixed with UI state
- Cache invalidation requires manual handling
- Retry logic must be custom
- Pagination requires complex reducers
- Background refetch logic unclear

**TanStack Query handles server-specific concerns:**

- Stale data detection
- Automatic refetch intervals
- Request deduplication
- Error retry strategies
- Background sync

**Separation of concerns:**

- Redux: "What is the app's current state?"
- TanStack Query: "What data has the server?"
- Clear boundaries = easier testing

---

## Implementation Strategy

### Redux Toolkit Setup

```typescript
// src/redux/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/auth";
import uiReducer from "./slices/ui";
import themeReducer from "./slices/theme";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Redux Slices

```typescript
// src/redux/slices/auth.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: User | null;
  tokens: { access: string; refresh: string } | null;
  isAuthenticated: boolean;
}

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    tokens: null,
    isAuthenticated: false,
  } as AuthState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
    },
    setTokens: (state, action) => {
      state.tokens = action.payload;
    },
  },
});

export default authSlice.reducer;
export const { setUser, clearAuth, setTokens } = authSlice.actions;
```

### TanStack Query Setup

```typescript
// src/services/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### TanStack Query Hooks

```typescript
// src/hooks/usePasswords.ts
import { useQuery } from "@tanstack/react-query"
import { api } from "../services/api"

export function usePasswords(filters?: PasswordFilters) {
  return useQuery({
    queryKey: ["passwords", filters],
    queryFn: () => api.getPasswords(filters),
    staleTime: 2 * 60 * 1000  // 2 minutes
  })
}

// Usage in component
function PasswordList() {
  const { data: passwords, isLoading, error } = usePasswords()

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  return <PasswordGrid passwords={passwords} />
}
```

### Invalidation Pattern

```typescript
// src/hooks/useCreatePassword.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useCreatePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PasswordInput) => api.createPassword(data),
    onSuccess: () => {
      // Invalidate all password queries
      queryClient.invalidateQueries({ queryKey: ["passwords"] });

      // Also invalidate security stats (they depend on passwords)
      queryClient.invalidateQueries({ queryKey: ["securityStats"] });
    },
  });
}

// Usage
function CreatePasswordForm() {
  const createMutation = useCreatePassword();

  const handleSubmit = async (data) => {
    await createMutation.mutateAsync(data);
    // TanStack Query automatically refetches
  };
}
```

### Component Integration

```typescript
// src/components/Dashboard.tsx
import { useSelector, useDispatch } from "react-redux"
import { usePasswords, useCategories } from "../hooks"
import { setActiveTab } from "../redux/slices/ui"

export function Dashboard() {
  // Redux: Application state
  const activeTab = useSelector((state) => state.ui.activeTab)
  const dispatch = useDispatch()

  // TanStack Query: Server state
  const { data: passwords, isLoading } = usePasswords()
  const { data: categories } = useCategories()

  const handleTabChange = (tab: string) => {
    dispatch(setActiveTab(tab))
  }

  return (
    <div>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab>Passwords</Tab>
        <Tab>Categories</Tab>
      </Tabs>

      {isLoading ? <Loading /> : <PasswordList passwords={passwords} />}
    </div>
  )
}
```

---

## Consequences

### Positive

✅ **Clear Separation:** Redux = app state, TanStack Query = server state  
✅ **Reduced Boilerplate:** No manual API call handling in Redux  
✅ **Better Caching:** TanStack Query's smart caching strategy  
✅ **Built-in DevTools:** Both Redux and TanStack Query have excellent DevTools  
✅ **Testability:** Each can be tested independently  
✅ **Performance:** Selective re-renders, no over-fetching  
✅ **Scalability:** Proven pattern for large apps

### Negative/Tradeoffs

⚠️ **Learning Curve:** Developers must understand both libraries  
⚠️ **Boilerplate for Redux:** More upfront setup than plain Context  
⚠️ **Two Sets of DevTools:** Requires switching between Redux and React Query devtools  
⚠️ **Initial Complexity:** More complex than Context API for small apps

### Mitigation

- Documentation with examples
- Custom hooks to hide complexity (usePasswords, useCategories)
- Clear folder structure (redux/, hooks/, queries/)
- Team training before implementation

---

## Alternatives Considered

### Context API + useReducer

**Why Not?**

- All context re-renders entire subtree
- No built-in caching
- No automatic retry logic
- Doesn't scale well
- Manual cache invalidation
- No time-travel debugging

### Zustand

**Why Not?**

- Simpler than Redux
- But still need TanStack Query for server state
- Less mature than Redux
- Smaller ecosystem
- Not significantly simpler given TanStack Query already used

### Apollo Client

**Why Not?**

- GraphQL-focused (VaultGuard uses REST)
- Overkill for REST API
- More complex setup than REST + TanStack Query
- Heavier bundle size

---

## Testing Strategy

### Redux Tests

```typescript
// src/redux/__tests__/auth.test.ts
describe("Auth Slice", () => {
  test("setUser sets authenticated user", () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    const user = { id: "1", email: "test@example.com" };

    store.dispatch(setUser(user));

    const state = store.getState();
    expect(state.auth.user).toEqual(user);
    expect(state.auth.isAuthenticated).toBe(true);
  });

  test("clearAuth clears user", () => {
    // Setup
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(setUser(mockUser));

    // Action
    store.dispatch(clearAuth());

    // Assert
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
  });
});
```

### TanStack Query Tests

```typescript
// src/hooks/__tests__/usePasswords.test.ts
describe("usePasswords", () => {
  test("fetches passwords on mount", async () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => usePasswords(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockPasswords)
  })

  test("retries on error", async () => {
    // Mock API error then success
    let attempts = 0
    jest.spyOn(api, "getPasswords").mockImplementation(() => {
      attempts++
      if (attempts === 1) throw new Error("Network error")
      return Promise.resolve(mockPasswords)
    })

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => usePasswords(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
```

### Integration Tests

```typescript
// src/__tests__/integration/auth-flow.test.ts
describe("Authentication Flow", () => {
  test("login updates Redux and fetches passwords via TanStack Query", async () => {
    const wrapper = ({ children }: any) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )

    const { result: authResult } = renderHook(() => useAppAuth(), { wrapper })
    const { result: pwdResult } = renderHook(() => usePasswords(), { wrapper })

    // Login
    await act(async () => {
      await authResult.current.login("user@example.com", "password")
    })

    // Verify Redux state
    expect(authResult.current.isAuthenticated).toBe(true)

    // Verify TanStack Query fetches
    await waitFor(() => {
      expect(pwdResult.current.isSuccess).toBe(true)
    })
  })
})
```

---

## Performance Implications

### Redux Performance

- Selector memoization prevents unnecessary re-renders
- Only components using changed state re-render
- DevTools show render performance

### TanStack Query Performance

- Query deduplication (same query = same request)
- Background refetching (users see stale data while fresh loads)
- Request cancellation on unmount
- Automatic garbage collection of unused queries

### Combined Benefits

- Minimal re-renders
- Reduced API calls
- Better mobile/slow network experience
- Automatic cache management

---

## Migration Plan

### Phase 2 (Frontend State Management)

1. **Week 1:** Redux Toolkit setup
   - Store configuration
   - Auth slice
   - UI slices
   - Integrate with authentication

2. **Week 2:** TanStack Query setup
   - Query client configuration
   - usePasswords hook
   - useCategories hook
   - useActivityLog hook

3. **Week 3:** Component refactoring
   - Update components to use Redux selectors
   - Update components to use TanStack Query
   - Remove Context API usage
   - Verify DevTools work

### Acceptance Criteria

- [ ] Redux store initialized
- [ ] All auth state in Redux
- [ ] All UI state in Redux
- [ ] TanStack Query client configured
- [ ] All API queries use TanStack Query
- [ ] No manual cache invalidation
- [ ] Performance benchmarks met
- [ ] > 90% component test coverage

---

## Related Decisions

- **ADR-001:** MongoDB (backend data)
- **ADR-002:** Encryption strategy (security)
- **ADR-004:** CSS Modules (styling)
- **Frontend Architecture:** `docs/architecture/frontend-architecture.md`

---

## References

- Redux Toolkit: https://redux-toolkit.js.org/
- TanStack Query: https://tanstack.com/query/latest
- Redux DevTools: https://github.com/reduxjs/redux-devtools
- TanStack Query DevTools: https://tanstack.com/query/latest/docs/devtools
- Frontend Architecture: `docs/architecture/frontend-architecture.md`
