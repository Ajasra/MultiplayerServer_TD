# CSS Architecture for Game Server

## Overview

This project uses a **simplified, Mantine-first CSS architecture** that avoids overcomplication
while providing game-specific optimizations.

## Philosophy

🎯 **Use Mantine first, add custom CSS only when truly needed.**

- Mantine provides 95% of our styling needs (spacing, colors, typography, responsive utilities)
- We only add custom CSS for game-specific requirements
- Keep it simple and maintainable

## File Structure

```
src/client/styles/
├── global.css              # Global resets, variables, Mantine integration
├── responsive-utilities.css # Game-specific responsive utilities (minimal)
├── utility-classes.css     # Essential utilities Mantine doesn't provide
└── README.md              # This file
```

## File Purposes

### `global.css`

- **Purpose**: Global resets, CSS variables, Mantine integration
- **Contains**:
  - Mantine CSS imports
  - Basic HTML resets
  - Game color variables
  - Mobile optimizations
  - Accessibility enhancements

### `responsive-utilities.css` (~130 lines)

- **Purpose**: Game-specific responsive utilities only
- **Contains**:
  - `.container-mobile-game` - Mobile game container
  - `.hide-mobile` / `.show-mobile` - Simple visibility
  - `.mobile-touch-target` - Touch-friendly targets
  - `.joystick-area-responsive` - Joystick sizing
  - `.button-group-mobile` - Responsive button layouts

### `utility-classes.css` (~60 lines)

- **Purpose**: Essential utilities Mantine doesn't provide
- **Contains**:
  - Layout essentials (`.w-full`, `.h-full`, `.flex`)
  - Game state classes (`.game-active`, `.game-waiting`, etc.)
  - Touch optimizations (`.touch-target`)
  - Performance utilities (`.will-change-transform`)
  - Accessibility (`.sr-only`)

## Usage Guidelines

### ✅ Do This

```jsx
// Use Mantine components and their built-in responsive props
<Container size="sm" p="md">
  <Stack spacing="lg">
    <Button variant="filled" size="lg">
      Play Game
    </Button>
  </Stack>
</Container>

// Use our minimal custom utilities for game-specific needs
<div className="container-mobile-game">
  <div className="joystick-area-responsive">
    <JoystickComponent />
  </div>
</div>
```

### ❌ Don't Do This

```jsx
// Don't create custom spacing when Mantine has it
<div className="p-4 mb-6"> {/* Use Mantine's p="md" mb="xl" instead */}

// Don't create custom responsive utilities when Mantine has them
<div className="grid-cols-2 gap-4"> {/* Use Mantine's Grid component instead */}
```

## When to Add Custom CSS

Only add custom CSS when:

1. **Game-specific responsive behavior** (mobile game containers, joystick areas)
2. **Touch interaction optimizations** (touch targets, mobile Safari fixes)
3. **Game state styling** (active/waiting/over states)
4. **Performance optimizations** (will-change, backface-visibility)
5. **Accessibility enhancements** (screen reader utilities)

## Responsive Breakpoints

We match Mantine's breakpoints:

- `xs`: 30em (480px) - Small phones
- `sm`: 48em (768px) - Large phones / Small tablets
- `md`: 64em (1024px) - Tablets / Small desktops
- `lg`: 74em (1184px) - Desktop
- `xl`: 90em (1440px) - Large desktop

## CSS Variables

Game-specific CSS variables in `:root`:

```css
--game-primary: #007bff;
--game-success: #28a745;
--game-warning: #ffc107;
--game-danger: #dc3545;
--game-info: #17a2b8;

--z-joystick: 10;
--z-modal: 1000;
--z-notification: 2000;
```

## Maintenance

- **Before adding CSS**: Check if Mantine already provides what you need
- **Keep it minimal**: Only add what's absolutely necessary
- **Document purpose**: Add comments explaining why custom CSS is needed
- **Test responsively**: Ensure all custom CSS works on mobile and desktop
