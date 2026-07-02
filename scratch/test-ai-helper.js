const { execSync } = require('child_process');

try {
    console.log('Fetching LITELLM_KEY from cluster...');
    const base64Key = execSync('kubectl get secret queima-buchinho-secret -n queima-buchinho -o jsonpath="{.data.LITELLM_KEY}"').toString().trim();
    if (!base64Key) {
        throw new Error('LITELLM_KEY not found in secret');
    }
    const key = Buffer.from(base64Key, 'base64').toString('utf-8');
    
    console.log('Running bun test-ai.ts...');
    execSync('bun test-ai.ts', {
        env: {
            ...process.env,
            LITELLM_API_KEY: key,
            LITELLM_BASE_URL: 'http://localhost:4000/v1',
            AI_MODEL: 'cloud/llama-8b'
        },
        stdio: 'inherit'
    });
    console.log('Test execution finished.');
} catch (err) {
    console.error('Helper Error:', err.message);
    if (err.stderr) {
        console.error('Stderr:', err.stderr.toString());
    }
    process.exit(1);
}
