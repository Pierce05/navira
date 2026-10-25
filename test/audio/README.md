# Test audio

Drop a 16-bit PCM mono WAV named `demo.wav` here (about 20 seconds, someone reading the demo story aloud in Hinglish:
"Mujhe do saal se periods ke time bahut zyada pet dard hota hai, kabhi kabhi college nahi ja paati ...").
Chromium plays it as the fake microphone. Do not commit real patient audio. Only read-aloud synthetic text.

Then: `npm run build && npx playwright test --project=voice`. Timings are written to `test-results/voice-timing.json`.
