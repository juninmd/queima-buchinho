import 'dotenv/config';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY
});

const model = process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
console.log(`Using model: ${model}`);

const schema = z.object({
    message: z.string()
});

async function test() {
    try {
        const res = await generateObject({
            model: openrouter(model),
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
