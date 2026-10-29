---
name: special-design-components
description: Build raised blue action buttons with a luminous inner edge and layered shadows, matching the supplied special component reference. Use for this button treatment or requests for a tactile, glossy primary button.
---

# Special design components

This skill currently contains one recipe: the rounded blue “Add team member” button. Add other component recipes only when requested.

## Raised blue button

The reference uses a solid blue face, white label and plus icon, a fine white gradient edge, a soft white inset highlight, and a blue outer rim above a black drop shadow. The luminous edge supplies the depth; avoid a dramatic face gradient or continuous glow animation.

Reference values (CSS pixels, before adapting the control's size):

| Layer | Value |
| --- | --- |
| Face | `#296FF0` |
| Label/icon | `#FFFFFF` |
| Inside stroke | 1px white, linear fade from 40% at the top to transparent at the bottom |
| Drop shadow | `0 3px 6px rgb(0 0 0 / 20%)` |
| Inner highlight | `inset 0 0 6px 2px rgb(255 255 255 / 24%)` |
| Outer rim | `0 0 0 1px #296FF0` |

Build it with the app's existing button primitive and a reusable semantic class. A transparent 1px border plus two background layers creates the inside gradient stroke without extra DOM. Keep the blue `background-color` behind both layers so the transparent end of the stroke stays blue. Put the inset highlight first in `box-shadow`, then the blue rim, then the drop shadow.

```css
.button-raised {
  --raised-fill: #296ff0;
  --raised-label: #fff;
  --raised-edge: rgb(255 255 255 / 40%);
  --raised-edge-end: rgb(255 255 255 / 0%);
  --raised-highlight: rgb(255 255 255 / 24%);
  --raised-shadow: rgb(0 0 0 / 20%);
  color: var(--raised-label);
  background-color: var(--raised-fill);
  background-image:
    linear-gradient(var(--raised-fill), var(--raised-fill)),
    linear-gradient(to bottom, var(--raised-edge), var(--raised-edge-end));
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border: 1px solid transparent;
  border-radius: 12px;
  box-shadow:
    inset 0 0 6px 2px var(--raised-highlight),
    0 0 0 1px var(--raised-fill),
    0 3px 6px var(--raised-shadow);
}
```

Use white text with a regular-to-medium weight, a 16–20px decorative plus icon, an 8px icon gap, 16px horizontal padding, and at least a 40px desktop / 44px phone height. Scale to the app's normal controls rather than copying the enlarged reference image's dimensions. Verify label contrast at the final size, especially if changing the blue or highlight.

Provide hover, keyboard focus, pressed, pending, and disabled states. A slightly darker face on hover and a 1px downward press are enough. Keep the focus outline outside the rim. Do not animate shadows or gradients; transition only colour, opacity, or transform for 120–180ms, and remove transitions and movement under reduced motion. Disabled and pending controls must suppress the action and keep a readable label. Use a real button for actions and a real link for navigation, hide the decorative icon from assistive technology, and preserve existing form validation and pending behaviour.

## In d3CRM

- Reuse `Button` from `components/ui/button.tsx` with `className="button button-raised"`; no new wrapper or dependency is needed.
- The maintained implementation and interaction states live in the “Raised action button” block at the end of `app/brand.css`. Reuse those rules instead of duplicating the snippet.
- The existing usage is `AddMemberForm` in `components/organization-settings-forms.tsx`, visible to workspace owners in Settings.
- Use selectively for a prominent action. Preserve the existing hierarchy of secondary and destructive actions.
- Check the actual screen at desktop and 320, 375, 414, and 768px widths, plus keyboard focus, disabled, and reduced-motion states. Ensure the outer shadow is not clipped.
