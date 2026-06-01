import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const litellm = createOpenAI({
    apiKey: process.env.LITELLM_API_KEY,
    baseURL: process.env.LITELLM_BASE_URL,
});

const model = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
console.log(`Using model: ${model}`);

const schema = z.object({
    message: z.string()
});

async function test() {
    try {
        const res = await generateObject({
            model: litellm(model),
            prompt: 'Say hello in Portuguese',
            schema
        });
        console.log('✅ AI response:', res.object);
    } catch(e: any) {
        console.error('❌ ERRO:', e.message);
        if (e.cause) console.error('Cause:', e.cause);
        process.exit(1);
    }
}

test();
