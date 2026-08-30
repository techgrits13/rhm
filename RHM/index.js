import { registerRootComponent } from 'expo';
import App from './App';

// OneSignal handles all background push delivery natively —
// no background message handler needed here.

registerRootComponent(App);
