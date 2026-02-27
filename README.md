# gemini_view_images

View and review images similar to `process_images` repo but implemented as an Electron app using **TypeScript** instead of Tkinter and Python. The current `process_images` app wouldn't run on a Macbook Air.

## Development

- Install dependencies:
  - `npm install`
- Run the app (builds TypeScript then starts Electron):
  - `npm start`

The Electron entrypoint is authored in `main.ts`, with `preload.ts` bridging to the renderer logic in `renderer.ts`. Type definitions for the folder/media tree and the exposed preload API live in `types.ts`.
