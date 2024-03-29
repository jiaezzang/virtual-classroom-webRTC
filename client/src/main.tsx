import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
import { version } from '../package.json';
import './index.css';

console.log('v' + version);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppRouter />
    </React.StrictMode>
);
