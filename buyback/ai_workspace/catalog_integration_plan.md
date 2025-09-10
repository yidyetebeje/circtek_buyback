# Catalog Integration Implementation Plan

## Overview
This plan outlines the steps to implement the catalog integration for the application, which includes device categories, brands, model series, and models with full multilingual support.

## 1. API Service Layer
- [x] Create a `lib/api` directory structure for API services
- [x] Implement a base API client with authentication handling
- [x] Create typed API services for each catalog entity:
  - [x] CategoryService
  - [x] BrandService
  - [x] ModelSeriesService
  - [x] ModelService

## 2. Data Models & Types
- [x] Create `types` directory for shared data types
- [x] Define interfaces for all catalog entities with proper validation
- [x] Create translation type interfaces
- [x] Build request/response type definitions based on API schema

## 3. React Query Integration
- [x] Set up React Query provider in the application
- [x] Create custom hooks for each catalog entity:
  - [x] `useCategories` (list, get, create, update, delete)
  - [x] `useBrands` (list, get, create, update, delete)
  - [x] `useModelSeries` (list, get, create, update, delete)
  - [x] `useModels` (list, get, create, update, delete)

## 4. Admin Interface - Pages
- [x] Create admin catalog pages structure:
  - [x] `/app/[locale]/catalog/admin/categories/`
  - [x] `/app/[locale]/catalog/admin/brands/`
  - [x] `/app/[locale]/catalog/admin/model-series/`
  - [x] `/app/[locale]/catalog/admin/models/`

## 5. UI Components
- [ ] Build reusable data table component for listing entities
- [ ] Create form components for entity creation/editing
- [ ] Implement translation form components
- [ ] Design filter and search components

## 6. Shared Components
- [ ] Build pagination component
- [ ] Create language selector
- [ ] Implement image upload component for icons/logos
- [ ] Build breadcrumb navigation component

## 7. Admin Interface - Features
- [ ] Implement CRUD operations for each entity
- [ ] Add multilingual editing capabilities
- [ ] Create relationship management UI (linking models to series, etc.)
- [ ] Add SEO fields management

## 8. Testing & QA
- [ ] Create unit tests for API services
- [ ] Implement component tests
- [ ] Perform end-to-end testing

## Directory Structure

```
/lib/api/
  - base.ts (Base API client)
  - types.ts (Common API types)
  - catalog/
    - categoryService.ts
    - brandService.ts
    - modelSeriesService.ts
    - modelService.ts
/types/
  - catalog.ts (Catalog entity types)
  - api.ts (API request/response types)
/hooks/
  - catalog/
    - useCategories.ts
    - useBrands.ts
    - useModelSeries.ts
    - useModels.ts
/app/[locale]/admin/
  - categories/
    - page.tsx
    - [id]/page.tsx
  - brands/
    - page.tsx
    - [id]/page.tsx
  - model-series/
    - page.tsx
    - [id]/page.tsx
  - models/
    - page.tsx
    - [id]/page.tsx
```
