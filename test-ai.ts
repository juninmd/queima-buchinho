import 'dotenv/config';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

const litellm = createOpenAICompatible({
    name: 'litellm',
    apiKey: process.env.LITELLM_API_KEY ?? '',
    baseURL: process.env.LITELLM_BASE_URL ?? '',
});

const model = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
console.log(`Using model: ${model}`);

const schema = z.object({
    message: z.string()
});

function parseJson(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON object in response');
    }
    return JSON.parse(text.slice(start, end + 1));
}

async function test() {
    try {
        if (model.startsWith('local/')) {
            const res = await generateText({
                model: litellm(model),
                prompt: 'Say hello in Portuguese. Return only valid JSON like {"message":"..."}'
            });
            console.log('âœ… AI response:', schema.parse(parseJson(res.text)));
            return;
        }

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
