# **App Name**: TITANIC

## Core Features:

- Real-time Location Tracking: Tracks user locations via GPS and updates the map in real-time using a Leaflet or similar 2D map plugin. This will be where users can freely move on and it will be displaying locations.
- Proximity Detection: Detects when players are within 50 meters of each other. Once two players are within 50m the battle button will appear on their device allowing to partake.
- QR Code Handshake: Generates and scans QR codes (or similar) for players to confirm their proximity and initiate a battle after detecting players withing 50m
- Mini-Game Battles: Implements a Pong mini-game where players deal damage to each other based on wins in the mini-game to simulate health bar decreasing as damage output increases. If the health reaches 0, game ends
- Unique Opponent Lockout: Tracks daily battles to prevent repeated matchups against the same opponent. To store what battles have been done today.
- Leaderboard Display: Displays leaderboards for local university and global wins in separate tabs in a menu for user profile
- User Authentication and University Selection: Allows users to register accounts, log in, and select their university during registration to view which location has the highest score

## Style Guidelines:

- Primary color: Vibrant blue (#29ABE2) to evoke a sense of technology and connectedness. This color looks very professional and looks modern.
- Background color: Light gray (#F5F5F5) for a clean and modern look with a brightness appropriate.
- Accent color: Bright orange (#FF8C00) to highlight interactive elements and call-to-action buttons.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines, and 'Inter' (sans-serif) for body text. The two work hand-in-hand to generate a sleek application, without it being to boring.
- Lucide Icons user icon on top of map and modern, minimalist icons for UI elements. Looks up-to-date without falling to deep.
- Map-centric layout with floating UI elements for leaderboard, settings, and chat, resembling Pokémon GO's interface, where a map and location will take center stage
- Smooth transitions and animations for map updates and battle sequences.