# Project Brief: Neurodivergent Sensory Coping Game

## 1. Overview
An interactive 2-screen installation designed to simulate office sensory overload and demonstrate the efficacy of coping tools.
- **Screen 1 (TV):** High-stimulus office environment (visual/audio).
- **Screen 2 (Table Projection):** Interactive surface with 4 "Coping Tools" mapped to physical locations.
- **Interaction:** Top-down webcam tracking using MediaPipe to detect "touches" on the projected tools.

## 2. System Architecture
- **Language:** HTML5, CSS3, JavaScript.
- **Tracking:** MediaPipe Hands (CDN-based).
- **Audio:** Spatial/Ambient audio for sensory overload; localized cues for "touches."
- **Mapping:** 4-point perspective transform (or simple coordinate scaling) to align webcam FOV with projection size.

## 3. Game Flow
1. **The Overload Phase:** The TV displays a chaotic office (fluorescent flickering, phone ringing, chatter). The table shows 4 grayed-out coping tools.
2. **The Interaction:** Participants touch a tool on the table.
3. **The Response:** - The projection highlights the tool and displays a brief explanation (e.g., "Noise Canceling: Reduces auditory input to manageable levels").
   - The TV audio/visuals "calm down" momentarily while the tool is active.
4. **Conclusion:** After all 4 tools are explored, a summary of neurodivergent support strategies is displayed.

## 4. Hardware Configuration
- **PC:** Running a Chrome/Edge browser instance.
- **Display 1 (HDMI/DP):** 1080p TV.
- **Display 2 (HDMI/DP):** Projector mounted top-down or short-throw.
- **Sensor:** 720p/1080p Webcam mounted alongside the projector.

## 5. Coding Task Requirements for Claude
Please generate the code for this project following these requirements:

### A. The Setup Script
- Initialize MediaPipe Hands.
- Create a calibration overlay to map webcam $(x, y)$ to the browser window dimensions.
- Implement a "Mirror Toggle" for the webcam feed.

### B. The Logic
- Define 4 "Hot Zones" (Circles or Rectangles) on the Table screen.
- Create a 'Trigger' function: when a hand coordinate enters a Hot Zone for > 0.5 seconds, activate the Tool.
- Implement a State Manager to sync the TV visuals with the Table interactions.

### C. The Visuals
- **TV Screen:** A CSS-based "flicker" effect and high-energy animations.
- **Table Screen:** Minimalist, high-contrast UI (Industrial Minimalist style). Use clear typography for the explanation text.