fetch('https://openrouter.ai/api/v1/models').then(r=>r.json()).then(d=>console.log(d.data.filter(m=>m.id.includes('gemini') && m.id.includes('free')).map(m=>m.id)))
