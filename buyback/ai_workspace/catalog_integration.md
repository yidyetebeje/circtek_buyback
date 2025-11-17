

## Front‑End Developer Guide

**Admin Catalog Dashboard – Elysia API v0.0.0**

> Use this playbook as the single source of truth for wiring the React (Vite) admin dashboard to the catalog micro‑service. Follow the tasks in order. Every code example is intentionally brief—focus on clarity, not boilerplate.

---

### 1. Tech Stack & Conventions

| Concern       | Decision                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------- |
| Framework     | **React 18 + TypeScript** (Vite template)                                                 |
| State / Data  | TanStack Query v5 (react‑query) for caching, mutations, optimistic updates                |
| HTTP          | Axios (global instance with interceptors)                                                 |
| Rich Text     | **tiptap v2** (starterKit + Link + Image) for all `description`/`meta_description` fields |
| UI            | shadcn/ui + Tailwind CSS (utility‑first, dark‑mode ready)                                 |
| Forms         | react‑hook‑form + zod for schema‑driven validation (mirror OpenAPI)                       |
| Icons         | lucide‑react                                                                              |
| Routing       | react‑router‑dom v6 (private `<AdminLayout>` guard)                                       |
| Lint / Format | eslint + prettier (Airbnb/React profile)                                                  |
| Tests         | Vitest + React Testing Library (focus on store/query hooks)                               |

---

### 2. API Primer (what comes back / what to send)

Every resource follows the same contract:

| Verb       | URL                            | Body schema (⬆ send)                   | Success (⬇ receive)                                |
| ---------- | ------------------------------ | -------------------------------------- | -------------------------------------------------- |
| **GET**    | `/api/catalog/<resource>/`     | *n/a*                                  | `{ data: <Item[]>, meta: { page, limit, total } }` |
| **GET**    | `/api/catalog/<resource>/{id}` | *n/a*                                  | `{ data: <Item> }`                                 |
| **POST**   | same root                      | JSON or `multipart/form-data` per spec | `{ data: <Item>, message: "created" }`             |
| **PUT**    | with `{id}`                    | same as POST (all fields optional)     | `{ data: <Item>, message: "updated" }`             |
| **DELETE** | with `{id}`                    | *n/a*                                  | `{ message: "deleted" }`                           |

Pagination & sorting:

```
GET /api/catalog/categories?page=1&limit=20&orderBy=order_no&order=asc
```

* **page** (default 1)
* **limit** (1‑100, default 20)
* **orderBy** (field name)
* **order** (`asc`|`desc`)
* Optional **tenantId** filter on most endpoints.

> ⚠️  Expect 4xx with `{ error, details[] }` on validation errors and 401/403 on auth.

Examples (Categories):

```ts
interface Category {
  id: number;
  title: string;
  icon: string | null;
  description: string | null;
  order_no: number | null;
  sef_url: string;
  client_id: number;
  // SEO
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
}
```



Translations are nested arrays:

```ts
interface Translation {
  language_id: number;
  title: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
}
```

Uploading icons/images → `POST /.../{id}/icon` with `multipart/form-data` containing a single `file` field. Accepted mime: `image/*`.

---

### 3. Task Breakdown (execute sequentially)

| #  | Task                                                                                                                                                                                                                               | Key outputs                                                                                                                  |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Project bootstrap** – create Vite React + TS repo, add Tailwind, shadcn init, ESLint + Prettier config.                                                                                                                          | Running dev server, CI lint pass                                                                                             |
| 2  | **Auth shell** – stub JWT login flow (assume `/api/auth/login`). Store token in HttpOnly cookie; Axios interceptor adds `Authorization: Bearer <token>` header.                                                                    | `useAuth()` hook                                                                                                             |
| 3  | **Design system** – configure Tailwind theme (gray/primary palette, `font-sans` → Inter, large spacing scale). Create reusable `Card`, `DataTable`, `FormField`, `ConfirmDialog` components.                                       | Storybook stories                                                                                                            |
| 4  | **API Layer** – Generate type‑safe hooks via `openapi-typescript-codegen` or manual zod schemas. Provide `useCategories()` (list), `useCategory(id)`, `useUpsertCategory()`, … repeat for Brands, Model Series, Models, Languages. | Hook tests                                                                                                                   |
| 5  | **Layout** – Responsive `<Sidebar />` with collapse, `<Header />` with breadcrumb. Route groups: `/categories`, `/brands`, `/series`, `/models`, `/languages`.                                                                     | Screens scaffolded                                                                                                           |
| 6  | **Categories CRUD UI**                                                                                                                                                                                                             | Paginated table, search (query params), Create/Edit drawer with tiptap for description. Image upload with drop‑zone preview. |
| 7  | **Translations sub‑view** – Tabs inside Category & Brand & Series modals for each language. Use tiptap locale.                                                                                                                     | Language toggle working                                                                                                      |
| 8  | **Brands & Series CRUD** – Same pattern; pay attention to icon vs image fields.                                                                                                                                                    | End‑to‑end tests                                                                                                             |
| 9  | **Model CRUD** – Relational selectors (Category → Brand → Series). Use TanStack Query’s `queryClient.invalidateQueries()` strategy.                                                                                                | Optimistic updates                                                                                                           |
| 10 | **Languages management** – Simple list, toggle active/default states with `PUT /set-default`.                                                                                                                                      | Edge‑case: prevent deleting default language                                                                                 |
| 11 | **Global notifications** – Success & error toast queue.                                                                                                                                                                            | UX polish                                                                                                                    |
| 12 | **Access control** – Role‑based navigation (admin only). Hide endpoints not allowed.                                                                                                                                               | Guards tested                                                                                                                |
| 13 | **Final pass** – ARIA roles, keyboard nav, color‑contrast audit, Lighthouse ≥ 90.                                                                                                                                                  | Deployment preview                                                                                                           |

---

### 4. UI/UX Standards

1. **Minimal & Familiar:** white/neutral background, 14‑16 px base font, 4/8 px spacing grid, radius `round-lg`, shadow‑sm for cards.
2. **One‑task‑per‑screen:** avoid nested modals. Use drawers or side panels for edit forms.
3. **Feedback loops:** inline field errors, top‑right toast on success/failure.
4. **Tiptap styling:** prose class with Tailwind‑typography plugin; toolbar fixed to top border of editor.
5. **Tables:** sticky header, zebra rows (`bg-muted/50`), sortable columns, selectable rows for bulk delete.
6. **Dark mode:** opt‑in via system preference (`dark:` classes).
7. **Accessibility:** adhere to WCAG 2.1 AA, all icon buttons have `aria-label`.

---

### 5. Endpoint‑to‑Screen Mapping (quick reference)

| Screen                | Primary endpoint(s)                              |      |     |                                                    |
| --------------------- | ------------------------------------------------ | ---- | --- | -------------------------------------------------- |
| Categories list       | `GET /api/catalog/categories`                    |      |     |                                                    |
| Category detail       | `GET /api/catalog/categories/{id}`               |      |     |                                                    |
| Create/Update Cat     | `POST /api/catalog/categories` / `PUT /.../{id}` |      |     |                                                    |
| Category icon upload  | `POST /api/catalog/categories/{id}/icon`         |      |     |                                                    |
| Category translations | \`GET                                            | POST | PUT | DELETE /api/catalog/categories/{id}/translations\` |
| Brands                | Same pattern under `/api/catalog/brands`         |      |     |                                                    |
| Model Series          | `/api/catalog/model-series`                      |      |     |                                                    |
| Models                | `/api/catalog/models`                            |      |     |                                                    |
| Languages             | `/api/catalog/languages` (+ `/set-default`)      |      |     |                                                    |

---

### 6. Sample Code Snippets

```ts
// api.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  r => r,
  err => {
    toast.error(err.response?.data?.error ?? 'Unexpected error');
    return Promise.reject(err);
  },
);

// hooks/useCategories.ts
export const useCategories = (params: Pagination = { page: 1, limit: 20 }) =>
  useQuery({
    queryKey: ['categories', params],
    queryFn: () => api.get('/api/catalog/categories', { params }).then(r => r.data),
    staleTime: 60 * 1000,
  });
```

```tsx
// <CategoryForm />
const methods = useForm<CategoryInput>({
  resolver: zodResolver(schema),
  defaultValues: initial,
});

const onSubmit = methods.handleSubmit(async values => {
  await mutateAsync(values);
  toast.success('Saved');
  close();
});
```

```tsx
// tiptap setup
const editor = useEditor({
  extensions: [StarterKit, Link, Image],
  content: defaultValue,
});
return <EditorContent editor={editor} className="prose dark:prose-invert" />;
```

---

### 7. Deliverables Checklist

* [ ] README with project setup & `.env.example`
* [ ] Type‑safe API hooks (categories, brands, series, models, languages)
* [ ] Responsive admin layout
* [ ] CRUD flows with optimistic UI
* [ ] i18n translation handling



**Execute each task, commit often, and open a pull request per checklist item.** The backend is stable—focus on clean abstractions, predictable UX, and production‑ready accessibility.

Good luck building an excellent, modern, minimal admin dashboard!
