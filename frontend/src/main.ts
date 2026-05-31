import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

interface UmamiRuntimeEnv {
  websiteId?: string;
  shareToken?: string;
}

function injectUmamiTracker(): void {
  const env = (window as unknown as { __UMAMI__?: UmamiRuntimeEnv }).__UMAMI__ ?? {};
  if (!env.websiteId) {
    return;
  }
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/umami.js';
  script.dataset['websiteId'] = env.websiteId;
  // Sans data-host-url, le tracker derive l'endpoint depuis script.src :
  // "/umami.js" -> base URL -> "/api/send", qui via nginx atterrit sur le
  // backend Spring (location ^~ /api/) et renvoie 401. On force le prefixe
  // "/umami" pour que l'endpoint devienne /umami/api/send (proxie vers Umami).
  script.dataset['hostUrl'] = '/umami';
  document.head.appendChild(script);
}

injectUmamiTracker();
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
