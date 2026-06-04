# アイウ

AI-Powered Mock Interview Platform

## Introduction

アイウ is an interview preparation tool that provides AI feedback on your mock interviews using Claude AI.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

3. Install dependencies and run:

```bash
npm install
npm run dev
```

## Environment Variables

```
SHOPAIKEY_API_KEY=         # Your ShopAIKey API key
SHOPAIKEY_ANTHROPIC_BASE_URL=https://api.shopaikey.com
SHOPAIKEY_OPENAI_BASE_URL=https://api.shopaikey.com/v1

# Optional: rate-limiting via Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Deploy on Vercel

Push to GitHub and import the repository on [Vercel](https://vercel.com). Add the environment variables above in the Vercel project settings.

## Tech Stack

- [Next.js](https://nextjs.org/) – React framework
- [Tailwind CSS](https://tailwindcss.com/) – Styling
- [Framer Motion](https://framer.com/motion) – Animations
- [Claude AI](https://anthropic.com) – Interview feedback via ShopAIKey
- [Whisper](https://platform.openai.com/docs/guides/speech-to-text) – Audio transcription via ShopAIKey
- [FFMPEG.WASM](https://ffmpegwasm.netlify.app/) – Audio conversion
- [Upstash](https://upstash.com/) – Optional rate limiting

## How it works

1. Record your interview answer via webcam
2. FFmpeg converts the video to MP3 audio
3. Whisper transcribes the audio to text
4. Claude AI generates detailed feedback on your answer
