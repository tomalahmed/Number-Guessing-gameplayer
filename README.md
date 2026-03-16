# 🚀 Lost Digit Hunt

Welcome to **Lost Digit Hunt**, a high-polish, sci-fi-themed number guessing game built with a focus on clean architecture, smooth UX, and advanced web features.

## 🎮 Live Demo
[https://game-guessthenum.netlify.app/]()

## ✨ Features

- **Three Difficulty Levels:**
  - Easy: 1-50
  - Normal: 1-100
  - Hard: 1-500
- **Interactive Search Zone:** A real-time visual tracker bar that narrows down as you receive clues, giving a tactical feel to the hunt.
- **Smart Hints:** Dynamic feedback system (e.g., "Way too high," "Close," or "Too low").
- **Procedural Audio:** Built using the Web Audio API. All sound effects (clicks, success, errors) are generated via code—no external audio files required.
- **Persistent Scoring:** High scores are saved to `localStorage` so your progress remains even after a refresh.
- **A11y (Accessibility):** Includes ARIA labels, `aria-live` regions for screen readers, and `@media (prefers-reduced-motion)` support.

## 🛠️ Technical Stack

- **HTML5:** Semantic structure for better SEO and accessibility.
- **CSS3:** Glassmorphism UI, custom variables for easy theming, and smooth keyframe animations.
- **Vanilla JavaScript:** Modular code organization using specialized objects:
  - `state`: Manages game logic, scores, and difficulty.
  - `ui`: Handles DOM updates and visual feedback.
  - `audio`: Manages the procedural sound synthesis.

## 🚀 Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tomalahmed/Lost-Digit-Hunt-Game.git
      ```
2. Open `index.html` in your browser.

No dependencies required! This is pure Vanilla JS.

## 📐 The Logic Behind the Tracker

The "Search Zone" uses a dynamic calculation to represent the remaining possibility space visually:

```text
Search % = ((Current High - Current Low) / Initial Max) × 100
```

This provides players with an immediate visual representation of their progress.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
