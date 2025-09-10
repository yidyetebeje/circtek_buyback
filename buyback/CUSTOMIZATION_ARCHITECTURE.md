# Customization Architecture Documentation

## 1. Summary of Work Done

During this development session, we implemented a comprehensive real-time customization system for the shop homepage. Key achievements include:

1.  **New Components:**
    *   `Partners.tsx`: Displays partner information, integrated into the homepage.
    *   `ConfigSidebar.tsx`: A global configuration panel for site-wide settings.
    *   `ComponentEditor.tsx`: A focused editor for component-specific content and settings.
    *   `ThemeProvider.tsx`: Manages and applies theme and design system changes via CSS variables.

2.  **Core Customization Features:**
    *   **Theme Customization:** Editable primary, secondary, and accent colors.
    *   **Design System:**
        *   **Layouts:** Switch between 'default', 'compact', and 'spacious' page layouts affecting overall element scaling and spacing.
        *   **Border Radius:** Sliders for customizing the roundness of buttons, cards, and input fields.
        *   **Spacing:** Adjustable vertical padding for page sections.
        *   **Dark Mode:** Toggle for light/dark theme.
    *   **Content Customization:**
        *   Editable text content for the Hero section (title, subtitle, description, button text/link).
        *   Editable names and descriptions for Categories.
        *   Editable background image URL for the Hero section.
    *   **Section Management:**
        *   **Visibility:** Toggle the display of major sections (Featured Products, Testimonials, Partners).
        *   **Ordering:** Reorder main page sections (Categories, Featured Products, Testimonials, Partners).
    *   **Advanced:**
        *   Export current configuration as a JSON file.
        *   Reset all settings to their default values.

3.  **User Interface for Customization:**
    *   A **Floating Action Button (FAB)** to toggle the main `ConfigSidebar`.
    *   `ConfigSidebar` uses a **tabbed interface** (General, Design, Sections, Advanced) for organized access to settings.
    *   **"Edit" buttons** are placed on each major page section, allowing users to open the `ComponentEditor` for that specific component.
    *   Visual previews for layout options and intuitive controls like sliders and color pickers.

4.  **Technical Implementation:**
    *   **State Management:** `HomePageClient.tsx` manages the `ShopConfig` in its local React state, allowing for reactive updates to the UI.
    *   **Dynamic Styling:** `ThemeProvider.tsx` translates `ShopConfig` theme and design settings into CSS custom properties (variables) applied to the root HTML element.
    *   **CSS Variables:** `styles/globals.css` defines and utilizes these CSS variables for global styling, utility classes, and dark mode.
    *   **Dynamic Rendering:** `HomePageClient.tsx` renders page sections dynamically based on visibility flags and order specified in `ShopConfig`.
    *   **Type Safety:** Extensive use of TypeScript with detailed type definitions in `types/shop.ts` for `ShopConfig`, `DesignSystem`, `SectionOrdering`, and component-specific configurations.
    *   **Default Configuration:** `config/defaultShopConfig.ts` provides the baseline configuration.

## 2. Architecture of Customizability

The architecture is designed for real-time, client-side customization of the shop homepage, centered around a dynamic `ShopConfig` object.

### 2.1. Core Concepts

*   **`ShopConfig` (Single Source of Truth - Client-Side):**
    *   Defined in `types/shop.ts`, this object holds all customizable parameters for the current session.
    *   It includes `theme` (colors), `design` (layout, spacing, roundness, dark mode), `heroSection` content, `categories` data, `sectionOrder`, and visibility flags for sections (`showFeaturedProducts`, etc.).
    *   An initial version is loaded by `app/[locale]/page.tsx` (e.g., from `getShopConfig`) and passed to `HomePageClient`.

*   **`HomePageClient.tsx` (Orchestrator):**
    *   The primary client component responsible for managing the `shopConfig` in its React state.
    *   It renders the main page structure, including the Hero section and other dynamic sections.
    *   It passes the `shopConfig` and `onConfigChange` callback to `ConfigSidebar` and `ComponentEditor`.
    *   The `handleConfigChange` method merges partial updates into the main `shopConfig` state, ensuring proper handling of nested objects and defaults.

*   **`ThemeProvider.tsx` (Dynamic Styling Engine):**
    *   Receives `theme` and `design` objects from `shopConfig`.
    *   Uses `useEffect` to update CSS custom properties (e.g., `--color-primary`, `--radius-button`, `--layout-multiplier`, `--spacing-section`) on the `document.documentElement`.
    *   Adds/removes a `dark-mode` class on `document.documentElement` based on the `design.darkMode` setting.

*   **`styles/globals.css` (Styling Foundation):**
    *   Defines default values for all CSS custom properties set by `ThemeProvider`.
    *   Contains global styles (e.g., for `body`), utility classes (e.g., `.btn`, `.card`), and dark mode overrides that use these CSS variables.
    *   This allows styles to adapt dynamically when the CSS variables change.

*   **Configuration UI Components:**
    *   **`ConfigSidebar.tsx`:**
        *   Provides a global interface for modifying `shopConfig`.
        *   Changes are collected and sent to `HomePageClient` via the `onConfigChange` callback.
        *   Features tabs for different categories of settings (General, Design, Sections, Advanced).
    *   **`ComponentEditor.tsx`:**
        *   Provides a focused interface for editing properties of a specific component (e.g., Hero section text, category details).
        *   Opened via "Edit" buttons on the main page sections.
        *   Receives the relevant part of `shopConfig` and the `componentType` to display appropriate fields.
        *   Sends updates through the same `onConfigChange` callback to `HomePageClient`.

### 2.2. Data Flow & Interaction

1.  **Initialization:**
    *   `app/[locale]/page.tsx` loads the initial `ShopConfig`.
    *   `HomePageClient` receives this and sets it as its initial state.
    *   `ThemeProvider` (within `MainLayout`) applies initial theme and design as CSS variables.

2.  **User Interaction & Updates:**
    *   User interacts with controls in `ConfigSidebar` (e.g., changes a color, adjusts a slider) or `ComponentEditor` (e.g., edits text).
    *   The UI component (`ConfigSidebar` or `ComponentEditor`) updates its internal temporary state.
    *   On change (or on save for some actions), the component calls the `onConfigChange` function (passed from `HomePageClient`) with a `Partial<ShopConfig>` object representing the changes.

3.  **State Update & Re-render:**
    *   `HomePageClient.handleConfigChange` receives the partial update.
    *   It merges this update with the current `shopConfig` state, creating a new state object.
    *   `setShopConfig` is called, triggering a re-render of `HomePageClient` and its children.

4.  **Style Application:**
    *   As `HomePageClient` re-renders, `MainLayout` and `ThemeProvider` receive the updated `shopConfig`.
    *   `ThemeProvider`'s `useEffect` hook runs, updating the CSS custom properties on the `document.documentElement`.
    *   Components styled with these CSS variables (either directly or via Tailwind classes configured to use them) automatically reflect the new styles without needing direct prop changes for every style property.

5.  **Dynamic Content & Layout Rendering:**
    *   `HomePageClient` re-evaluates which sections to display and their order based on the updated `shopConfig.show<SectionName>` and `shopConfig.sectionOrder`.
    *   Components receive updated props from `shopConfig` if their direct content (like `heroSection.title`) has changed.

### 2.3. Key Architectural Decisions

*   **Client-Side Real-Time Updates:** All customization logic and state management (for the session) are handled on the client-side for immediate visual feedback.
*   **CSS Custom Properties for Theming/Design:** This is a powerful and efficient way to manage a wide range of dynamic style changes. It decouples the JavaScript logic from direct DOM style manipulation for many properties and leverages the browser's CSS engine.
*   **Centralized State with Propagated Changes:** `HomePageClient` acts as the central hub for `ShopConfig` state, with changes flowing downwards to components and upwards from configuration UIs via callbacks.
*   **Modularity of Configuration UIs:** Separating global (`ConfigSidebar`) and component-specific (`ComponentEditor`) configuration interfaces provides a more organized and intuitive user experience.
*   **Type Safety with TypeScript:** Ensures robustness and better developer experience by clearly defining the structure of `ShopConfig` and related data.

This architecture allows for a highly interactive and visually configurable user experience, giving administrators significant control over the look, feel, and structure of their shop's homepage directly from the browser. 