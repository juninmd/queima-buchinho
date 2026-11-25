import QRCode from 'qrcode';
import { pool } from '../config/database';
import { createPairingCode, listDevices, pairingLink, revokeAllDevices, revokeDevice, CODE_TTL_MIN } from '../api/pairing.store';

async function main(): Promise<void> {
  const [cmd = 'new', arg] = process.argv.slice(2);
  if (cmd === 'new') {
    const url = process.env.PUBLIC_API_URL?.trim() || arg;
    if (!url) throw new Error('Defina PUBLIC_API_URL (ex.: https://queima-api.exemplo.com) ou passe a URL: bun run pair new <url>');
    if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) throw new Error('A URL do servidor precisa ser https://');
    const { code, expiresAt } = await createPairingCode();
    console.log(await QRCode.toString(pairingLink(url, code), { type: 'terminal', small: true, errorCorrectionLevel: 'M' }));
    console.log(`Escaneie no app. Uso único; expira em ${CODE_TTL_MIN} min (${expiresAt.toISOString()}).`);
  } else if (cmd === 'list') {
    for (const d of await listDevices()) console.log(`#${d.id}\t${d.name}\t${d.revoked_at ? 'REVOGADO' : 'ativo'}\tcriado ${new Date(d.created_at).toISOString()}\túltimo uso ${d.last_used_at ? new Date(d.last_used_at).toISOString() : '-'}`);
  } else if (cmd === 'revoke') {
    const id = Number(arg);
    if (!Number.isInteger(id)) throw new Error('Uso: bun run pair revoke <id>');
    console.log((await revokeDevice(id)) ? `Dispositivo #${id} revogado.` : `Dispositivo #${id} não encontrado ou já revogado.`);
  } else if (cmd === 'revoke-all') {
    console.log(`${await revokeAllDevices()} dispositivo(s) revogado(s).`);
  } else throw new Error('Comandos: new [url] | list | revoke <id> | revoke-all');
}

main().catch((e) => { console.error(`Erro: ${(e as Error).message}`); process.exitCode = 1; }).finally(() => pool.end());
