# Repository Cleanup Plan
## Professional Structure Overhaul

### Issues Found:
1. **Duplicate .gitignore files** (3x) - consolidate to root only
2. **Mixed TypeScript/JavaScript** - Remove .tsx files (project uses JSX)
3. **Duplicate utility files** - lib/utils.js vs lib_newlanding/utils.js
4. **Old admin components** - Components/Admin_Components vs components/admin
5. **Empty files** - empty.tsx exists
6. **Naming inconsistencies** - Some files use PascalCase, others camelCase

### Cleanup Actions:

#### Phase 1: Remove Duplicate/Unnecessary Files
- [ ] Delete client/.gitignore (keep root only)
- [ ] Delete server/.gitignore (keep root only)
- [ ] Delete all .tsx files (project uses .jsx)
- [ ] Delete client/src/components/newlanding/ui/empty.tsx
- [ ] Delete client/src/lib_newlanding/utils.js (consolidate into lib/utils.js)
- [ ] Delete client/src/hooks_newlanding/ (consolidate into hooks/)

#### Phase 2: Consolidate Components
- [ ] Audit Components/Admin_Components vs components/admin
- [ ] Remove old Admin_Sidebar if not used
- [ ] Standardize naming conventions

#### Phase 3: Standardize Structure
- [ ] All components: PascalCase.jsx
- [ ] All utilities: camelCase.js
- [ ] Pages: PascalCase.jsx

#### Phase 4: Update Imports
- [ ] Fix all broken imports after cleanup
- [ ] Test build
