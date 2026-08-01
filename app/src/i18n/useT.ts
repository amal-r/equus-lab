import { useAppStore } from '../store/useAppStore';
import { strings, StringKey } from './strings';

type Vars = Record<string, string | number>;

function interpolate(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return Object.keys(vars).reduce((acc, k) => acc.split(`{${k}}`).join(String(vars[k])), tpl);
}

export function useT() {
  const lang = useAppStore((s) => s.lang);
  const dict = strings[lang];
  function t(key: StringKey, vars?: Vars): string {
    const val = dict[key];
    const text = Array.isArray(val) ? val.join(', ') : (val as string) ?? String(key);
    return interpolate(text, vars);
  }
  function tArr(key: StringKey): string[] {
    const val = dict[key];
    return Array.isArray(val) ? val : [String(val)];
  }
  return { t, tArr, lang };
}
