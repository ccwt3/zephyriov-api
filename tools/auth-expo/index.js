import { registerRootComponent } from 'expo';
import { createElement as h, useEffect, useState } from 'react';
import { Button, Linking, ScrollView, Text } from 'react-native';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import * as Browser from 'expo-web-browser';
import { createReturnGate } from './return-gate.mjs';

const baseURL = 'http://localhost:3402';
const callback = 'zephyriov-auth-probe://verified';
const auth = createAuthClient({ baseURL, plugins: [expoClient({
  scheme: 'zephyriov-auth-probe', storagePrefix: 'zephyriov-auth-probe',
  storage: SecureStore, disableCache: true,
})] });
const gate = createReturnGate(callback);
let waitingForBrowser = false;

function Probe() {
  const [session, setSession] = useState('loading');
  const [cookie, setCookie] = useState('unknown');
  const [browser, setBrowser] = useState('idle');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const result = await auth.getSession({ query: { disableCookieCache: true } });
    if (result.error) throw new Error('Session request failed');
    setSession(result.data ? (result.data.user.emailVerified ? 'verified' : 'pending') : 'none');
    setCookie(await auth.getCookie() ? 'yes' : 'no');
  }
  async function action(work) {
    setBusy(true);
    try { await work(); } catch { setBrowser('request failed'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    void action(refresh);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!waitingForBrowser || url !== callback) setBrowser('rejected return');
    });
    return () => subscription.remove();
  }, []);
  async function browse(cancelTest) {
    let url = `${baseURL}/probe/wait`;
    if (!cancelTest) {
      const response = await fetch(`${baseURL}/probe/verification-link`, {
        headers: { cookie: await auth.getCookie(), 'expo-origin': 'zephyriov-auth-probe://' },
        credentials: 'omit',
      });
      if (!response.ok) throw new Error('No verification link');
      url = (await response.json()).url;
    }
    gate.begin();
    waitingForBrowser = true;
    setBrowser('waiting');
    try {
      const result = await Browser.openAuthSessionAsync(url, callback);
      if (result.type !== 'success') { setBrowser('cancelled'); return; }
      if (!gate.accept(result.url)) { setBrowser('rejected return'); return; }
      await refresh();
      setBrowser('accepted');
    } finally {
      gate.cancel();
      waitingForBrowser = false;
    }
  }
  const button = (title, work) => h(Button, { key: title, title, accessibilityLabel: title,
    disabled: busy, onPress: () => void action(work) });
  return h(ScrollView, { contentContainerStyle: { padding: 32, paddingTop: 64, gap: 18 } },
    h(Text, null, 'Zephyriov Auth — local probe'),
    h(Text, null, `Session: ${session}`),
    h(Text, null, `Secure cookie: ${cookie}`),
    h(Text, null, `Browser: ${browser}`),
    button('Register', async () => {
      const result = await auth.signUp.email({ name: 'Auth probe', email: 'authprobe@example.invalid',
        password: 'synthetic-probe-password-123', callbackURL: callback });
      if (result.error) throw new Error('Registration failed');
      await refresh();
    }),
    button('Verify in browser', () => browse(false)),
    button('Cancel browser test', () => browse(true)),
    button('Check session', refresh),
    button('Sign out', async () => {
      const result = await auth.signOut();
      if (result.error) throw new Error('Sign out failed');
      await refresh();
    }),
  );
}
registerRootComponent(Probe);
