---
name: Zenith Kanji
colors:
  surface: '#f4fafd'
  surface-dim: '#d4dbdd'
  surface-bright: '#f4fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f7'
  surface-container: '#e8eff1'
  surface-container-high: '#e2e9ec'
  surface-container-highest: '#dde4e6'
  on-surface: '#161d1f'
  on-surface-variant: '#3e4851'
  inverse-surface: '#2b3234'
  inverse-on-surface: '#ebf2f4'
  outline: '#6e7883'
  outline-variant: '#bec7d3'
  surface-tint: '#006398'
  primary: '#006398'
  on-primary: '#ffffff'
  primary-container: '#00aaff'
  on-primary-container: '#003c5d'
  inverse-primary: '#93ccff'
  secondary: '#b10075'
  on-secondary: '#ffffff'
  secondary-container: '#de0093'
  on-secondary-container: '#fffbff'
  tertiary: '#850aeb'
  on-tertiary: '#ffffff'
  tertiary-container: '#c088ff'
  on-tertiary-container: '#520096'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#ffd8e7'
  secondary-fixed-dim: '#ffafd2'
  on-secondary-fixed: '#3d0025'
  on-secondary-fixed-variant: '#8b005b'
  tertiary-fixed: '#efdbff'
  tertiary-fixed-dim: '#dbb8ff'
  on-tertiary-fixed: '#2b0053'
  on-tertiary-fixed-variant: '#6600b7'
  background: '#f4fafd'
  on-background: '#161d1f'
  surface-variant: '#dde4e6'
typography:
  display-kanji:
    fontFamily: Plus Jakarta Sans
    fontSize: 120px
    fontWeight: '700'
    lineHeight: 140px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  japanese-subtext:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is built for high-retention learning, blending a **Corporate / Modern** structural foundation with **Gamified** visual cues. The brand personality is encouraging and disciplined, designed to reduce cognitive load while maintaining the momentum of a "streak-based" educational experience.

The visual style utilizes a "Tiered Progression" aesthetic. By using distinct, high-vibrancy colors for different linguistic categories (Radicals, Kanji, Vocabulary), the UI provides instant semantic recognition. Large amounts of whitespace ensure that the intricate details of Japanese characters are never lost in visual noise. The interface feels like a premium, focused workspace—professional enough for serious study but energetic enough to feel like a rewarding game.

## Colors

The color palette is functionally mapped to the learning hierarchy. Each "level" of Japanese mastery has a dedicated color identity to help the user mentally categorize information:

- **Primary (Radical Blue):** Used for fundamental building blocks. It is calming and foundational.
- **Secondary (Kanji Pink):** Used for core characters. It is high-energy and signifies the primary challenge.
- **Tertiary (Vocabulary Purple):** Used for word combinations. It is sophisticated and signifies the application of knowledge.
- **Neutrals:** A range of professional grays (Cool Gray 50 to 900) manages the UI skeleton, ensuring the vibrant category colors remain the focal point.

Color is also used for gamified feedback: Success Green for correct answers and Error Red for reviews that require more practice.

## Typography

Typography prioritizes legibility and stroke clarity for Japanese characters. 

- **Display Kanji:** Used for the primary character being studied. It must be centered, massive, and utilize high-contrast weight to show stroke order and radicals clearly.
- **Headlines:** Uses **Plus Jakarta Sans** for a modern, friendly, and optimistic feel.
- **Body:** Uses **Inter** for its neutral, systematic quality, ensuring that long mnemonics and explanations are easy to read.
- **Labels:** Uses **JetBrains Mono** for technical data (on’yomi/kun’yomi readings, JLPT levels) to provide a structured, "data-rich" feel.

For Japanese rendering, the system should fallback to a high-quality Gothic typeface (like Noto Sans JP) to ensure consistency with the Latin weights.

## Layout & Spacing

This design system utilizes a **Fluid Grid** with a strict 8px baseline rhythm. The layout is designed to minimize distractions during "Review Sessions."

- **The Review Arena:** A focused, centered layout (max-width: 800px) that removes all sidebars and global navigation to ensure 1:1 focus between the student and the character.
- **The Dashboard:** A 12-column grid that organizes progress stats into modular widgets. 
- **Adaptation:** On mobile, margins tighten to 16px, and multi-column "meaning/reading" sections reflow into a single vertical stack. 
- **Whitespace:** Generous padding (stack-lg) is used between the Kanji display and the input fields to prevent accidental taps and visual crowding.

## Elevation & Depth

To maintain a clean, educational atmosphere, the system uses **Tonal Layers** rather than heavy shadows.

- **Level 0 (Background):** Light gray (#F9FAFB) to reduce eye strain during long study sessions.
- **Level 1 (Cards/Surface):** Pure white with a very subtle, low-opacity 1px border (#E5E7EB).
- **Level 2 (Active States):** Elements "lift" using a soft, tinted shadow that matches the category color (e.g., a soft pink glow for an active Kanji card).
- **Review Input:** The input field uses a slight inset shadow to feel "physical" and receptive to text, emphasizing the importance of the user's answer.

## Shapes

The shape language is **Rounded**, evoking a sense of approachability and friendliness. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Category Chips:** Use the **rounded-xl** (1.5rem) setting to create "capsule" shapes, making them feel like distinct, touchable objects.
- **Kanji Tiles:** Large square tiles used in the dashboard utilize **rounded-lg** (1rem) to feel more substantial and "collectible."

## Components

- **Review Input:** A large, borderless text input that sits below the display Kanji. It features a bottom-bar indicator that changes color based on the category (Blue/Pink/Purple) and flashes green/red on submission.
- **Flashcard:** A double-sided component. The "Front" shows the character; the "Back" uses a vertical split to separate "Meaning" (left) and "Reading" (right).
- **Progress Hexagons:** Custom-shaped indicators for "Srs Level" (Apprentice, Guru, Master, etc.) that fill with color as the user progresses.
- **Action Buttons:** Primary buttons are high-contrast with a slight "thick" bottom border (2px) to give them a tactile, pressable feel.
- **Mnemonic Boxes:** Specially styled containers with a light-bulb icon and a pale yellow background, used to separate memory aids from factual data.
- **Review Timeline:** A horizontal bar chart component showing upcoming review counts over the next 24 hours using low-saturation versions of the primary palette.