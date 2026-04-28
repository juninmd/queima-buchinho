# Media Feature Design - Queima Buchinho

**Date**: 2026-04-28
**Author**: AI Agent
**Status**: Approved

## 1. Overview

Add automatic sending of stickers (GIFs) and images to the Telegram bot using Giphy API for dynamic, entertaining media content.

## 2. Goals

- Send celebratory GIFs when user logs a workout
- Send sarcastic/funny memes when user hasn't trained
- Send hydration motivation images
- Send morning motivation images
- Allow manual search via commands

## 3. Architecture

### New Files

```
src/services/media.service.ts    # Giphy API integration
```

### Updated Files

```
src/utils/telegram.ts           # Add sendPhoto, sendSticker helpers
src/services/meme.service.ts   # Integrate media search terms
src/controllers/bot.controller.ts  # Auto-send media on events
src/config/constants.ts         # New messages and media config
```

### Assets

```
assets/stickers/               # Local fallback stickers
assets/images/                 # Local fallback images
```

## 4. API Integration

### Giphy API

- **Endpoint**: `https://api.giphy.com/v1/gifs/search`
- **Stickers Endpoint**: `https://api.giphy.com/v1/stickers/search`
- **API Key**: Public beta key for development
- **Rate Limit**: 100 requests/hour

### Search Terms by Event

| Event | Giphy Search Term |
|-------|------------------|
| Workout logged | `celebration dance` or `flex` |
| No workout | `fail meme` or `crying` |
| Hydration | `water drinking` or `hydrate` |
| Morning | `good morning workout` |
| Achievement | `trophy winner` |
| Cardio | `running excited` |

## 5. Functions to Implement

### media.service.ts

```typescript
class MediaService {
  // Search GIFs from Giphy
  async searchGifs(query: string, limit?: number): Promise<GiphyResult[]>

  // Search stickers from Giphy
  async searchStickers(query: string, limit?: number): Promise<GiphyResult[]>

  // Get random GIF for category
  async getRandomGif(category: MediaCategory): Promise<string | null>

  // Get local fallback asset
  getLocalSticker(category: string): string | null
  getLocalImage(category: string): string | null
}
```

### telegram.ts additions

```typescript
async function sendPhotoMessage(bot, chatId, photoPath, caption, options?)
async function sendStickerMessage(bot, chatId, stickerPath, options?)
```

## 6. Bot Events → Media Mapping

### Automatic Triggers

1. **User logs workout** (`handleMessage` → workout logged)
   - Send: Celebration GIF + congrats message

2. **Check workout - trained** (`/checktreino`)
   - Send: Motivational GIF

3. **Check workout - NOT trained** (`/checktreino`)
   - Send: Sarcastic meme + roast audio

4. **Water reminder**
   - Send: Hydration-related GIF

5. **Morning reminder**
   - Send: Fitness motivation image

6. **Streak achievement** (7+ days)
   - Send: Trophy/winner GIF

### Manual Commands

| Command | Action |
|---------|--------|
| `/meme <termo>` | Search and send meme GIF |
| `/sticker <termo>` | Search and send sticker |
| `/gif <termo>` | Search and send GIF |

## 7. Error Handling

1. **Giphy API unavailable** → Use local fallback assets
2. **Local asset missing** → Send text-only message
3. **Invalid API response** → Log error, continue with text
4. **Rate limited** → Cache recent results, use fallback

## 8. Environment Variables

```env
GIPHY_API_KEY=dc6zaTOxFJmzC  # Public beta key (or get own)
```

## 9. Testing Plan

1. Test Giphy API connectivity
2. Test each event trigger sends correct media
3. Test fallback to local assets
4. Test manual commands work
5. Verify rate limiting behavior

## 10. Implementation Order

1. Create `media.service.ts` with Giphy integration
2. Add `sendPhoto`, `sendSticker` to `telegram.ts`
3. Update `meme.service.ts` to return media search terms
4. Update `bot.controller.ts` to send media on events
5. Add local fallback assets
6. Add manual commands
7. Test and validate
