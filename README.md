# Proof of Grass

A walking pact you prove with a photo. You promise "I walk 4 days a week". Each day brings three quests (say, a tree, a bird and a dog). Step outside, photograph any one of them, and an open AI model checks the photo **on your phone**. The photo is never saved or uploaded.

**Try it:** https://proof-of-grass.onrender.com. It's on free hosting, so the first visit after a quiet spell takes up to a minute to wake the server.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 1 ("Touch Grass").

## How the photo check works

- The phone runs the vision half of OpenAI's CLIP ViT-B/32 (8-bit, about 85 MB, plus a 27 MB WebAssembly runtime) with [Transformers.js](https://github.com/huggingface/transformers.js), inside a Web Worker. It turns the photo into 512 numbers in about a second. After the first download it works offline.
- The text side is computed once, ahead of time: `npm run embeds` writes `client/public/embeds.json`.
- [`shared/decide.js`](shared/decide.js) compares the photo with 8 quests and 3 decoys (road, building, person), and with descriptions of outdoor and indoor scenes. A walk counts when one of today's quests is in the top 2 with at least 20%, and the photo looks at least 35% outdoors. The decoys are there so a selfie or a street doesn't pass as "grass" by accident.
- [`npm run eval`](eval/eval.mjs) checks that rule on 39 labelled Wikimedia Commons photos. The bar: no photo passes for a quest that isn't in it, no room, office or screen photo passes, and at least 90% of the quest photos pass.

### Eval results

```
main subject passed:        18/20 (bar 18)   missed: sky-2 sky-3
wrong-quest passes:         0 (bar 0)
room/office/screen passes:  0 (bar 0)
known limit (indoor plant/dog passed): NEG-plantin-1:flower

BAR MET
```

The two misses are sky photos where the model ranks the trees, grass or water in them higher than the sky; they still pass for those quests. The known limit is a flower on a windowsill with trees outside the window.

## Privacy, and honest limits

- The photo never leaves the phone. For a walk, the server only ever receives `{date, quest, checkedAt}`.
- So the server can't verify a walk: a hand-made request could fake one. That's fine for an app you use to hold yourself, and a few friends, to a promise.
- CLIP can be fooled. A flower on a windowsill with trees outside can score as outdoors, and a printed photo of a tree held up outside would pass. The decoys and the outdoor check only reduce this.

## Stack

React + Vite (installable PWA) · Express · MongoDB Atlas with Mongoose · Transformers.js 4.3.1 + CLIP ViT-B/32, on the phone · Render

## Run it locally

Needs Node 24.

```bash
npm install
cp server/.env.example server/.env   # then set JWT_SECRET (the file shows how)
npm run dev:server                   # API on :3000, with a throwaway in-memory MongoDB
npm run dev:client                   # the app on :5173
npm test                             # unit and API tests
npm run eval                         # needs the photos: powershell -ExecutionPolicy Bypass -File scripts/fetch-eval-photos.ps1
```

## Licences

- App code: MIT (see [LICENSE](LICENSE)).
- CLIP ViT-B/32: MIT, © OpenAI. ONNX export: [Xenova/clip-vit-base-patch32](https://huggingface.co/Xenova/clip-vit-base-patch32).
- Transformers.js: Apache-2.0, © Hugging Face.
- Eval photos: Wikimedia Commons, each under its own Creative Commons licence or in the public domain. They are not in this repo; [eval/SOURCES.txt](eval/SOURCES.txt) lists each source and licence.
