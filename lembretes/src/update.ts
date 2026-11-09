export interface UpdateInfo { version: string; kind: 'desktop' | 'apk'; url?: string; apply?: () => Promise<void> }

const REPO = 'juninmd/queima-buchinho';
const isAndroid = (): boolean => /android/i.test(navigator.userAgent);
const gt = (a: string, b: string): boolean => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return false; };

/** Desktop: updater assinado do Tauri. Android: consulta a release do GitHub e oferece o APK. */
export async function checkUpdate(): Promise<UpdateInfo | null> {
  try {
    if (isAndroid()) {
      const { getVersion } = await import('@tauri-apps/api/app');
      const cur = await getVersion();
      const rels = (await (await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=15`)).json()) as { tag_name: string; draft: boolean; assets: { name: string; browser_download_url: string }[] }[];
      const r = rels.find((x) => !x.draft && x.tag_name.startsWith('lembretes-v'));
      const ver = r?.tag_name.replace('lembretes-v', '');
      const apk = r?.assets.find((a) => a.name.endsWith('.apk'));
      return ver && apk && gt(ver, cur) ? { version: ver, kind: 'apk', url: apk.browser_download_url } : null;
    }
    const { check } = await import('@tauri-apps/plugin-updater');
    const u = await check();
    if (!u) return null;
    return { version: u.version, kind: 'desktop', apply: async () => {
      await u.downloadAndInstall();
      await (await import('@tauri-apps/plugin-process')).relaunch();
    } };
  } catch { return null; /* sem rede, navegador ou build sem updater */ }
}
