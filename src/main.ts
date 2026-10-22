import './styles.css';
import { startApp } from './ui/app';
import { title } from './ui/screens/title';

void startApp(document.getElementById('app')!, title);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
