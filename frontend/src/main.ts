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
  document.head.appendChild(script);
}

injectUmamiTracker();
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
