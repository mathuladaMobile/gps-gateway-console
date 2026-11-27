/** Password policy shared by Register and Change User Password (same as the API's PASSWORD_POLICY). */
export const PASSWORD_MIN = 8

/** Each policy check, in display order; `key` is the i18n key under `register.rule`. */
export function passwordChecks(pw: string) {
  return [
    { key: 'length', ok: pw.length >= PASSWORD_MIN },
    { key: 'lower', ok: /[a-z]/.test(pw) },
    { key: 'upper', ok: /[A-Z]/.test(pw) },
    { key: 'digit', ok: /[0-9]/.test(pw) },
  ] as const
}

/** Random 10-character password that meets the policy (one of each class + 7 more, shuffled). */
export function generatePassword() {
  const sets = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789']
  const all = sets.join('')
  const rand = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const chars = [...sets.map((s) => s[rand(s.length)]), ...Array.from({ length: 7 }, () => all[rand(all.length)])]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
