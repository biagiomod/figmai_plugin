# Primary Button

## Overview

The Primary Button is the most prominent call-to-action component in the design system. It is used for the most important user actions and should be used sparingly to maintain visual hierarchy.

## Anatomy

- **Container**: Button frame with background color
- **Label**: Text content (required)
- **Icon** (optional): Leading or trailing icon
- **Loading State** (optional): Spinner or progress indicator

## Variants

### Size
- **Small**: 32px height, compact padding
- **Medium**: 44px height, standard padding (default)
- **Large**: 52px height, generous padding

### State
- **Default**: Normal appearance
- **Hover**: Elevated appearance, slight scale or shadow
- **Active**: Pressed appearance
- **Disabled**: Reduced opacity, non-interactive

### Width
- **Auto**: Width based on content
- **Full**: Full width of container

## Accessibility

- **Minimum Size**: 44x44px touch target (WCAG 2.1 Level AAA)
- **Keyboard Navigation**: Must be focusable and activatable with Enter/Space
- **Screen Readers**: Requires descriptive text or aria-label
- **Focus Indicators**: Visible focus ring (2px solid, high contrast)

## Implementation

### React Example
```jsx
<button
  className="btn btn-primary btn-medium"
  aria-label="Submit form"
  disabled={isLoading}
>
  {isLoading ? <Spinner /> : 'Submit'}
</button>
```

### HTML Example
```html
<button
  type="submit"
  class="btn-primary"
  aria-label="Submit contact form"
>
  Submit
</button>
```

## Examples

- **E-commerce**: "Add to Cart", "Checkout", "Place Order"
- **Forms**: "Submit", "Save Changes", "Continue"
- **Modals**: "Confirm", "Delete", "Publish"

## Common Pitfalls

1. **Too many primary buttons**: Only one primary button per view
2. **Generic labels**: Use specific action words, not "Click here"
3. **Missing disabled state**: Always handle loading/disabled states
4. **Insufficient contrast**: Ensure text meets WCAG AA standards
